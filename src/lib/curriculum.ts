import type { ClassGroup, Programme, Topic, Unit, Workspace } from './model';
import { now, uid } from './workspace';

// Shapes returned by the server's /api/tutorpro/curriculum endpoints.
export interface OutlineUnit {
  code: string;
  title: string;
  year: number;
  semester: number;
  credit_units: number;
  lecture_hours: number;
  tutorial_hours: number;
  practical_hours: number;
  clinical_hours: number;
  total_hours: number;
  start_marker: string;
}

export interface Outline {
  programme: {
    title: string;
    institution: string;
    award_level: string;
    duration_years: number;
    total_hours: number;
    overview: string;
    entry_requirements: string;
    assessment_policy: string;
  };
  classes: { name: string; year: number }[];
  units: OutlineUnit[];
}

export interface UnitDetail {
  overview: string;
  aims: string[];
  learning_outcomes: string[];
  topics: { title: string; hours: number; objectives: string[]; subtopics: string[]; practicals: string }[];
  teaching_methods: string[];
  assessment: string;
  references: string[];
  hours_estimated: boolean;
}

const DETAIL_WORDS = /objective|outcome|contact hours|content|topic|aims?\b|description|competenc/;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Character offset where a unit's detailed section starts, or -1. */
export function findUnitStart(text: string, unit: Pick<OutlineUnit, 'start_marker' | 'code' | 'title'>, from = 0): number {
  const lower = text.toLowerCase();
  const tryFind = (needle: string) => {
    const n = needle.trim().toLowerCase();
    if (n.length < 4) return -1;
    // A unit is often first mentioned in a contents page or summary table; its
    // detailed section is the mention followed by outline vocabulary.
    const hits: number[] = [];
    for (let idx = lower.indexOf(n, from); idx >= 0 && hits.length < 50; idx = lower.indexOf(n, idx + n.length)) hits.push(idx);
    if (!hits.length) return -1;
    const detailed = hits.find((h) => DETAIL_WORDS.test(lower.slice(h + n.length, h + n.length + 600)));
    return detailed ?? hits[0];
  };
  for (const needle of [unit.start_marker, unit.code && `${unit.code} ${unit.title}`, unit.code, unit.title]) {
    if (!needle) continue;
    const at = tryFind(needle);
    if (at >= 0) return at;
  }
  // Fuzzy: compare with punctuation removed, then map back approximately.
  const title = squash(unit.title);
  if (title.length >= 6) {
    const words = title.split(' ').slice(0, 5).join(' ');
    const re = new RegExp(words.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^a-z0-9]+'), 'i');
    const m = re.exec(text.slice(from));
    if (m) return from + m.index;
  }
  return -1;
}

/** Split the curriculum text into one section per unit, in document order. */
export function sliceUnitSections(text: string, units: OutlineUnit[], maxChars = 60_000): string[] {
  const starts = units.map((u) => findUnitStart(text, u));
  const order = starts
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s);
  return units.map((u, i) => {
    const s = starts[i];
    if (s < 0) {
      // Not located: give the model the whole document (capped) and let it find the unit.
      return text.slice(0, maxChars);
    }
    const pos = order.findIndex((x) => x.i === i);
    const next = order[pos + 1]?.s ?? text.length;
    const end = Math.max(next, Math.min(text.length, s + 4000));
    return text.slice(s, Math.min(end, s + maxChars));
  });
}

/** Contact-hour ranges for a unit's topics, numbered across the unit (1-based). */
export function hourRanges(topics: Topic[]): Record<string, { start: number; end: number }> {
  const out: Record<string, { start: number; end: number }> = {};
  let next = 1;
  for (const t of topics) {
    const hours = t.hours > 0 ? t.hours : 1;
    out[t.id] = { start: next, end: next + hours - 1 };
    next += hours;
  }
  return out;
}

export function formatHours(start: number, end: number): string {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (end <= start) return `Hour ${f(start)}`;
  return `Hours ${f(start)}–${f(end)}`;
}

export function unitTotalHours(u: Unit): number {
  const fromTopics = u.topics.reduce((s, t) => s + (t.hours || 0), 0);
  return u.hours.total || u.hours.lecture + u.hours.tutorial + u.hours.practical + u.hours.clinical || fromTopics;
}

export function shortProgrammeName(title: string): string {
  return title.replace(/\s*(curriculum|syllabus|teacher'?s guide|programme|program)\b.*$/i, '').trim() || title;
}

/** Add an analysed curriculum to the workspace: programme, one class per year, and units. */
export function applyOutline(ws: Workspace, outline: Outline, opts: { referenceId?: string; intake?: string } = {}): { ws: Workspace; programme: Programme; unitIds: string[] } {
  const t = now();
  const programme: Programme = {
    id: uid('p-'),
    title: outline.programme.title || 'Imported curriculum',
    institution: outline.programme.institution,
    awardLevel: outline.programme.award_level,
    durationYears: Math.max(1, outline.programme.duration_years || 1),
    totalHours: outline.programme.total_hours,
    overview: outline.programme.overview,
    entryRequirements: outline.programme.entry_requirements,
    assessmentPolicy: outline.programme.assessment_policy,
    sourceReferenceId: opts.referenceId,
    createdAt: t,
    updatedAt: t,
  };
  const short = shortProgrammeName(programme.title);
  // Units without a year are placed in year 1 (below), so never create a "Year 0" class for them.
  const years = new Set<number>([...outline.classes.map((c) => c.year), ...outline.units.map((u) => u.year || 1)].filter((y) => y >= 1));
  for (let y = 1; y <= programme.durationYears; y += 1) years.add(y);
  const classes: ClassGroup[] = [...years]
    .sort((a, b) => a - b)
    .map((year) => {
      const named = outline.classes.find((c) => c.year === year)?.name;
      return {
        id: uid('cl-'),
        programmeId: programme.id,
        name: named || `${short} — Year ${year}`,
        year,
        intake: opts.intake ?? '',
        academicYear: ws.settings.academicYear,
        notes: '',
        createdAt: t,
      };
    });
  const units: Unit[] = outline.units.map((u) => ({
    id: uid('u-'),
    programmeId: programme.id,
    code: u.code,
    title: u.title,
    year: u.year || 1,
    semester: u.semester,
    creditUnits: u.credit_units,
    hours: {
      lecture: u.lecture_hours,
      tutorial: u.tutorial_hours,
      practical: u.practical_hours,
      clinical: u.clinical_hours,
      total: u.total_hours,
    },
    overview: '',
    aims: [],
    outcomes: [],
    topics: [],
    teachingMethods: [],
    assessment: '',
    references: [],
    hoursEstimated: false,
    referenceIds: opts.referenceId ? [opts.referenceId] : [],
    analysed: false,
    createdAt: t,
    updatedAt: t,
  }));
  return {
    ws: { ...ws, programmes: [...ws.programmes, programme], classes: [...ws.classes, ...classes], units: [...ws.units, ...units], updatedAt: t },
    programme,
    unitIds: units.map((u) => u.id),
  };
}

export function applyUnitDetail(unit: Unit, d: UnitDetail): Unit {
  const topics: Topic[] = d.topics.map((t) => ({ id: uid('t-'), title: t.title, hours: t.hours, objectives: t.objectives, subtopics: t.subtopics, practicals: t.practicals }));
  return {
    ...unit,
    overview: d.overview || unit.overview,
    aims: d.aims.length ? d.aims : unit.aims,
    outcomes: d.learning_outcomes.length ? d.learning_outcomes : unit.outcomes,
    topics: topics.length ? topics : unit.topics,
    teachingMethods: d.teaching_methods,
    assessment: d.assessment,
    references: d.references,
    hoursEstimated: d.hours_estimated,
    analysed: true,
    updatedAt: now(),
  };
}

/** Sort units the way a timetable reads: year, semester, code. */
export function sortUnits<T extends Pick<Unit, 'year' | 'semester' | 'code' | 'title'>>(units: T[]): T[] {
  return [...units].sort((a, b) => a.year - b.year || a.semester - b.semester || a.code.localeCompare(b.code, undefined, { numeric: true }) || a.title.localeCompare(b.title));
}
