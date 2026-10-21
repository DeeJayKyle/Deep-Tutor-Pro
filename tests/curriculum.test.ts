import { describe, expect, it } from 'vitest';
import {
  applyOutline,
  applyUnitDetail,
  findUnitStart,
  formatHours,
  hourRanges,
  shortProgrammeName,
  sliceUnitSections,
  sortUnits,
  unitTotalHours,
} from '../src/lib/curriculum';
import type { Outline, OutlineUnit, UnitDetail } from '../src/lib/curriculum';
import { emptyWorkspace, normalizeWorkspace } from '../src/lib/workspace';
import type { Topic, Unit } from '../src/lib/model';

const filler = (n: number) => 'x '.repeat(n / 2);
const ou = (code: string, title: string, extra: Partial<OutlineUnit> = {}): OutlineUnit => ({
  code,
  title,
  year: 1,
  semester: 1,
  credit_units: 3,
  lecture_hours: 30,
  tutorial_hours: 0,
  practical_hours: 15,
  clinical_hours: 0,
  total_hours: 45,
  start_marker: '',
  ...extra,
});

const TOC = 'TABLE OF CONTENTS\nPHA 101 Pharmaceutics I ..... 5\nPHA 102 Pharmacology I ..... 9\n';
const DOC =
  TOC +
  filler(1200) +
  '\nPHA 102 Pharmacology I\nGeneral objectives: by the end of the unit the learner should...\n' +
  filler(5000) +
  '\nPHA 101 Pharmaceutics I\nLearning outcomes: compound simple dosage forms.\n' +
  filler(5000);

describe('findUnitStart', () => {
  it('prefers the detailed section over a contents-page mention', () => {
    const at = findUnitStart(DOC, ou('PHA 101', 'Pharmaceutics I'));
    expect(at).toBe(DOC.indexOf('\nPHA 101 Pharmaceutics I\nLearning') + 1);
    expect(at).toBeGreaterThan(TOC.length);
  });

  it('falls back to the first mention when no detail follows', () => {
    const text = 'Intro ' + filler(800) + ' NUR 210 Midwifery ' + filler(800);
    expect(findUnitStart(text, ou('NUR 210', 'Midwifery'))).toBe(text.indexOf('NUR 210'));
  });

  it('uses the start marker first and honours the from offset', () => {
    const text = 'UNIT FOUR: anatomy topics ' + filler(700) + ' UNIT FOUR: anatomy content';
    const u = ou('ANA 4', 'Anatomy', { start_marker: 'UNIT FOUR: anatomy' });
    expect(findUnitStart(text, u)).toBe(0);
    expect(findUnitStart(text, u, 10)).toBe(text.lastIndexOf('UNIT FOUR'));
  });

  it('matches titles fuzzily across punctuation and line breaks', () => {
    const text = filler(100) + 'Health-Care\nEthics and Law: objectives' + filler(100);
    const at = findUnitStart(text, ou('', 'Health Care Ethics and Law'));
    expect(at).toBe(text.indexOf('Health-Care'));
  });

  it('returns -1 when the unit is absent or needles are too short', () => {
    expect(findUnitStart(DOC, ou('ZZZ 999', 'Astrophysics'))).toBe(-1);
    expect(findUnitStart('abc', ou('', 'ab'))).toBe(-1);
  });
});

describe('sliceUnitSections', () => {
  it('returns one section per unit in input order, cut at the next unit in the document', () => {
    const units = [ou('PHA 101', 'Pharmaceutics I'), ou('PHA 102', 'Pharmacology I')];
    const [s101, s102] = sliceUnitSections(DOC, units);
    expect(s101.startsWith('PHA 101 Pharmaceutics I\nLearning')).toBe(true);
    expect(s102.startsWith('PHA 102 Pharmacology I\nGeneral')).toBe(true);
    // PHA 102 comes first in the document, so its slice ends where PHA 101 starts.
    expect(s102).not.toContain('PHA 101 Pharmaceutics I\nLearning');
    expect(s101).not.toContain('PHA 102');
  });

  it('gives the whole (capped) document for units it cannot locate', () => {
    const [missing] = sliceUnitSections(DOC, [ou('ZZZ 999', 'Astrophysics')], 500);
    expect(missing).toBe(DOC.slice(0, 500));
  });

  it('keeps at least 4000 characters so short sections are not truncated by a nearby mention', () => {
    const text = 'AAA 100 First unit objectives ' + filler(100) + ' BBB 200 Second unit objectives ' + filler(6000);
    const [a] = sliceUnitSections(text, [ou('AAA 100', 'First unit'), ou('BBB 200', 'Second unit')]);
    expect(a.length).toBe(4000);
  });
});

describe('hourRanges / formatHours', () => {
  const t = (id: string, hours: number): Topic => ({ id, title: id, hours, objectives: [], subtopics: [], practicals: '' });
  it('numbers contact hours cumulatively, giving zero-hour topics one hour', () => {
    expect(hourRanges([t('a', 3), t('b', 0), t('c', 2), t('d', -1), t('e', 1)])).toEqual({
      a: { start: 1, end: 3 },
      b: { start: 4, end: 4 },
      c: { start: 5, end: 6 },
      d: { start: 7, end: 7 },
      e: { start: 8, end: 8 },
    });
    expect(hourRanges([])).toEqual({});
  });
  it('formats single hours and ranges', () => {
    expect(formatHours(4, 4)).toBe('Hour 4');
    expect(formatHours(1, 3)).toBe('Hours 1–3');
    expect(formatHours(1, 2.5)).toBe('Hours 1–2.5');
  });
});

describe('unitTotalHours / shortProgrammeName / sortUnits', () => {
  const unit = normalizeWorkspace({ units: [{ id: 'u', title: 'U' }] }).units[0];
  it('prefers the declared total, then the sum of hours, then topic hours', () => {
    expect(unitTotalHours({ ...unit, hours: { lecture: 10, tutorial: 5, practical: 0, clinical: 0, total: 60 } })).toBe(60);
    expect(unitTotalHours({ ...unit, hours: { lecture: 10, tutorial: 5, practical: 3, clinical: 2, total: 0 } })).toBe(20);
    expect(unitTotalHours({ ...unit, topics: [{ id: 't', title: 't', hours: 7, objectives: [], subtopics: [], practicals: '' }] })).toBe(7);
  });
  it('strips curriculum suffixes from programme titles', () => {
    expect(shortProgrammeName('Diploma in Pharmacy Curriculum 2022')).toBe('Diploma in Pharmacy');
    expect(shortProgrammeName("Certificate in Nursing Teacher's Guide")).toBe('Certificate in Nursing');
    expect(shortProgrammeName('Curriculum')).toBe('Curriculum');
  });
  it('sorts by year, semester, then code numerically', () => {
    const u = (code: string, year: number, semester: number) => ({ code, year, semester, title: code });
    const sorted = sortUnits([u('PHA 110', 1, 2), u('PHA 20', 1, 2), u('ANA 1', 2, 1), u('PHA 9', 1, 1)]);
    expect(sorted.map((x) => x.code)).toEqual(['PHA 9', 'PHA 20', 'PHA 110', 'ANA 1']);
  });
});

describe('applyOutline', () => {
  const outline: Outline = {
    programme: {
      title: 'Diploma in Pharmacy Curriculum',
      institution: 'Test School',
      award_level: 'Diploma',
      duration_years: 3,
      total_hours: 3000,
      overview: 'Overview',
      entry_requirements: 'UACE',
      assessment_policy: 'CA 40%',
    },
    classes: [{ name: 'Pharmacy Year One', year: 1 }],
    units: [ou('PHA 101', 'Pharmaceutics I'), ou('PHA 301', 'Clinical Pharmacy', { year: 3 })],
  };

  it('creates a programme, one class per year of the duration, and the units', () => {
    const ws = emptyWorkspace();
    const before = structuredClone(ws);
    const { ws: next, programme, unitIds } = applyOutline(ws, outline, { referenceId: 'ref-1', intake: '2026' });
    expect(ws).toEqual(before); // input not mutated
    expect(next.programmes).toHaveLength(1);
    expect(programme).toMatchObject({ title: 'Diploma in Pharmacy Curriculum', durationYears: 3, sourceReferenceId: 'ref-1' });
    expect(next.classes.map((c) => [c.year, c.name, c.intake])).toEqual([
      [1, 'Pharmacy Year One', '2026'],
      [2, 'Diploma in Pharmacy — Year 2', '2026'],
      [3, 'Diploma in Pharmacy — Year 3', '2026'],
    ]);
    expect(next.classes.every((c) => c.programmeId === programme.id)).toBe(true);
    expect(next.units.map((u) => u.id)).toEqual(unitIds);
    expect(next.units[1]).toMatchObject({ code: 'PHA 301', year: 3, programmeId: programme.id, referenceIds: ['ref-1'], analysed: false });
    expect(next.units[0].hours).toEqual({ lecture: 30, tutorial: 0, practical: 15, clinical: 0, total: 45 });
  });

  it('adds classes for unit years beyond the stated duration and defaults bad values', () => {
    const { ws, programme } = applyOutline(emptyWorkspace(), {
      ...outline,
      programme: { ...outline.programme, title: '', duration_years: 0 },
      classes: [],
      units: [ou('X 1', 'X', { year: 2 }), ou('Y 1', 'Y', { year: 0 })],
    });
    expect(programme.title).toBe('Imported curriculum');
    expect(programme.durationYears).toBe(1);
    // A unit without a year is placed in year 1, so no "Year 0" class may appear.
    expect(ws.classes.map((c) => c.year)).toEqual([1, 2]);
    expect(ws.units.map((u) => u.year)).toEqual([2, 1]);
  });

  it('keeps existing workspace content', () => {
    const base = normalizeWorkspace({ units: [{ id: 'old', title: 'Old unit' }], classes: [{ id: 'c0', name: 'Old class' }] });
    const { ws } = applyOutline(base, outline);
    expect(ws.units[0].id).toBe('old');
    expect(ws.classes[0].id).toBe('c0');
    expect(ws.units).toHaveLength(3);
  });
});

describe('applyUnitDetail', () => {
  const unit: Unit = { ...normalizeWorkspace({ units: [{ id: 'u1', title: 'U', overview: 'old overview', aims: ['old aim'], outcomes: ['old outcome'] }] }).units[0] };
  const detail: UnitDetail = {
    overview: '',
    aims: [],
    learning_outcomes: ['New outcome'],
    topics: [{ title: 'Topic 1', hours: 4, objectives: ['o'], subtopics: ['s'], practicals: 'p' }],
    teaching_methods: ['Lecture'],
    assessment: 'CAT',
    references: ['Book'],
    hours_estimated: true,
  };
  it('fills in detail, keeping existing values for empty fields', () => {
    const next = applyUnitDetail(unit, detail);
    expect(next.id).toBe('u1');
    expect(next.overview).toBe('old overview');
    expect(next.aims).toEqual(['old aim']);
    expect(next.outcomes).toEqual(['New outcome']);
    expect(next.topics).toHaveLength(1);
    expect(next.topics[0]).toMatchObject({ title: 'Topic 1', hours: 4 });
    expect(next.topics[0].id).toBeTruthy();
    expect(next).toMatchObject({ analysed: true, hoursEstimated: true, assessment: 'CAT', teachingMethods: ['Lecture'] });
  });
  it('keeps existing topics when the analysis found none', () => {
    const withTopics = { ...unit, topics: [{ id: 't', title: 'kept', hours: 1, objectives: [], subtopics: [], practicals: '' }] };
    expect(applyUnitDetail(withTopics, { ...detail, topics: [] }).topics[0].id).toBe('t');
  });
});
