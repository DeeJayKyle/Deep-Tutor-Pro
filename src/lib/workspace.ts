import type {
  BankQuestion,
  Chat,
  ClassGroup,
  ExamFormat,
  GradeBand,
  GradeComponent,
  MarkEntry,
  Note,
  Paper,
  Programme,
  Question,
  Reference,
  Settings,
  Student,
  Topic,
  Unit,
  Workspace,
} from './model';
import { SCHEMA_VERSION } from './model';

export const uid = (prefix = ''): string =>
  prefix + (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export const now = (): string => new Date().toISOString();

export function currentAcademicYear(date = new Date()): string {
  const y = date.getFullYear();
  // Academic years start in the second half of the calendar year in most institutions.
  return date.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export const DEFAULT_COMPONENTS: GradeComponent[] = [
  { id: 'cat1', name: 'CAT 1', kind: 'coursework', weight: 15, maxScore: 100 },
  { id: 'cat2', name: 'CAT 2', kind: 'coursework', weight: 15, maxScore: 100 },
  { id: 'assign', name: 'Assignment', kind: 'assignment', weight: 10, maxScore: 100 },
  { id: 'exam', name: 'End of semester exam', kind: 'exam', weight: 60, maxScore: 100 },
];

export const DEFAULT_BANDS: GradeBand[] = [
  { min: 80, grade: 'A', points: 5, remark: 'Distinction' },
  { min: 70, grade: 'B+', points: 4.5, remark: 'Very good' },
  { min: 60, grade: 'B', points: 4, remark: 'Credit' },
  { min: 55, grade: 'C+', points: 3.5, remark: 'Good' },
  { min: 50, grade: 'C', points: 3, remark: 'Pass' },
  { min: 45, grade: 'D+', points: 2.5, remark: 'Marginal fail' },
  { min: 40, grade: 'D', points: 2, remark: 'Fail' },
  { min: 0, grade: 'F', points: 0, remark: 'Fail' },
];

export const BUILTIN_FORMATS: ExamFormat[] = [
  {
    id: 'fmt-standard',
    name: 'Standard paper (MCQ + short answer + long essay)',
    duration: '3 hours',
    instructions:
      'Answer ALL questions in Sections A and B, and any TWO questions in Section C. Write your registration number on every answer sheet.',
    styleNotes: '',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    sections: [
      { title: 'Section A: Multiple choice questions', type: 'mcq', count: 30, marksEach: 1, choose: 0, instructions: 'Choose the single best answer.' },
      { title: 'Section B: Short answer questions', type: 'short', count: 8, marksEach: 5, choose: 0, instructions: 'Answer all questions.' },
      { title: 'Section C: Long essay questions', type: 'essay', count: 3, marksEach: 15, choose: 2, instructions: 'Answer any two questions.' },
    ],
  },
  {
    id: 'fmt-cat',
    name: 'Continuous assessment test (CAT)',
    duration: '1 hour',
    instructions: 'Answer ALL questions.',
    styleNotes: '',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    sections: [
      { title: 'Section A: Multiple choice questions', type: 'mcq', count: 10, marksEach: 1, choose: 0, instructions: '' },
      { title: 'Section B: Short answer questions', type: 'short', count: 4, marksEach: 5, choose: 0, instructions: '' },
      { title: 'Section C: Long essay question', type: 'essay', count: 1, marksEach: 10, choose: 0, instructions: '' },
    ],
  },
  {
    id: 'fmt-assignment',
    name: 'Assignment (structured / case-based)',
    duration: 'Two weeks',
    instructions: 'Submit a typed answer of not more than 2,000 words with references.',
    styleNotes: '',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    sections: [{ title: 'Assignment tasks', type: 'case', count: 2, marksEach: 50, choose: 0, instructions: '' }],
  },
];

export function defaultSettings(): Settings {
  return {
    institution: '',
    tutorName: '',
    department: '',
    academicYear: currentAcademicYear(),
    provider: 'auto',
    noteDetail: 'standard',
    components: DEFAULT_COMPONENTS.map((c) => ({ ...c })),
    bands: DEFAULT_BANDS.map((b) => ({ ...b })),
    passMark: 50,
    autoSync: true,
    theme: 'dark',
  };
}

export function emptyWorkspace(): Workspace {
  return {
    schema: SCHEMA_VERSION,
    programmes: [],
    classes: [],
    units: [],
    notes: [],
    references: [],
    papers: [],
    formats: BUILTIN_FORMATS.map((f) => structuredClone(f)),
    bank: [],
    students: [],
    marks: [],
    chats: [],
    settings: defaultSettings(),
    updatedAt: now(),
  };
}

// ---------------------------------------------------------------------------
// Tolerant normalisation: saved data, restored backups and synced copies all
// pass through here. Missing fields get defaults; malformed items are dropped
// rather than crashing the app.
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : d);
const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : d;
};
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObj) : []);
const id = (v: unknown, prefix: string): string => str(v) || uid(prefix);
const oneOf = <T extends string>(v: unknown, options: readonly T[], d: T): T =>
  (options as readonly string[]).includes(str(v)) ? (str(v) as T) : d;

const QUESTION_TYPES = ['mcq', 'true_false', 'short', 'structured', 'essay', 'case', 'fill', 'matching', 'calculation', 'practical'] as const;

export function normTopic(r: Raw): Topic {
  return {
    id: id(r.id, 't-'),
    title: str(r.title, 'Untitled topic'),
    hours: Math.max(0, num(r.hours)),
    objectives: strs(r.objectives),
    subtopics: strs(r.subtopics),
    practicals: str(r.practicals),
  };
}

export function normQuestion(r: Raw): Question {
  const options = strs(r.options);
  const ai = r.answerIndex === null || r.answerIndex === undefined ? null : num(r.answerIndex, -1);
  return {
    id: id(r.id, 'q-'),
    type: oneOf(r.type, QUESTION_TYPES, 'short'),
    prompt: str(r.prompt),
    options,
    answerIndex: ai !== null && ai >= 0 && ai < options.length ? ai : null,
    answer: str(r.answer),
    solution: str(r.solution),
    markingPoints: arr(r.markingPoints).map((p) => ({ point: str(p.point), marks: num(p.marks, 1) })),
    marks: Math.max(0, num(r.marks, 1)),
    topic: str(r.topic),
    difficulty: str(r.difficulty, 'moderate'),
    outcome: str(r.outcome),
  };
}

function normUnit(r: Raw): Unit {
  const h = isObj(r.hours) ? r.hours : {};
  const t = now();
  return {
    id: id(r.id, 'u-'),
    programmeId: str(r.programmeId) || undefined,
    code: str(r.code),
    title: str(r.title, 'Untitled unit'),
    year: Math.max(1, Math.round(num(r.year, 1))),
    semester: Math.max(0, Math.round(num(r.semester, 1))),
    creditUnits: num(r.creditUnits),
    hours: {
      lecture: num(h.lecture),
      tutorial: num(h.tutorial),
      practical: num(h.practical),
      clinical: num(h.clinical),
      total: num(h.total),
    },
    overview: str(r.overview),
    aims: strs(r.aims),
    outcomes: strs(r.outcomes),
    topics: arr(r.topics).map(normTopic),
    teachingMethods: strs(r.teachingMethods),
    assessment: str(r.assessment),
    references: strs(r.references),
    hoursEstimated: Boolean(r.hoursEstimated),
    referenceIds: strs(r.referenceIds),
    analysed: Boolean(r.analysed),
    createdAt: str(r.createdAt, t),
    updatedAt: str(r.updatedAt, t),
  };
}

export function normalizeWorkspace(input: unknown): Workspace {
  const base = emptyWorkspace();
  if (!isObj(input)) return base;
  const r = input;
  const t = now();
  const s = isObj(r.settings) ? r.settings : {};
  const components = arr(s.components).map((c) => ({
    id: id(c.id, 'c-'),
    name: str(c.name, 'Component'),
    kind: oneOf(c.kind, ['coursework', 'assignment', 'practical', 'exam', 'other'] as const, 'other'),
    weight: Math.max(0, num(c.weight)),
    maxScore: Math.max(1, num(c.maxScore, 100)),
  }));
  const bands = arr(s.bands).map((b) => ({ min: num(b.min), grade: str(b.grade, '?'), points: num(b.points), remark: str(b.remark) }));
  const settings: Settings = {
    ...base.settings,
    institution: str(s.institution),
    tutorName: str(s.tutorName),
    department: str(s.department),
    academicYear: str(s.academicYear, base.settings.academicYear),
    provider: oneOf(s.provider, ['auto', 'gemini', 'openai'] as const, 'auto'),
    noteDetail: oneOf(s.noteDetail, ['brief', 'standard', 'comprehensive'] as const, 'standard'),
    components: components.length ? components : base.settings.components,
    bands: bands.length ? bands.sort((a, b) => b.min - a.min) : base.settings.bands,
    passMark: num(s.passMark, 50),
    autoSync: s.autoSync === undefined ? true : Boolean(s.autoSync),
    theme: oneOf(s.theme, ['dark', 'light', 'system'] as const, 'dark'),
  };
  const formats = arr(r.formats).map(
    (f): ExamFormat => ({
      id: id(f.id, 'fmt-'),
      name: str(f.name, 'Exam format'),
      duration: str(f.duration),
      instructions: str(f.instructions),
      styleNotes: str(f.styleNotes),
      builtIn: Boolean(f.builtIn),
      createdAt: str(f.createdAt, t),
      sections: arr(f.sections).map((x) => ({
        title: str(x.title),
        type: oneOf(x.type, QUESTION_TYPES, 'short'),
        count: Math.max(1, Math.round(num(x.count, 1))),
        marksEach: Math.max(0, num(x.marksEach, 1)),
        choose: Math.max(0, Math.round(num(x.choose))),
        instructions: str(x.instructions),
      })),
    }),
  );
  for (const builtIn of base.formats) if (!formats.some((f) => f.id === builtIn.id)) formats.push(builtIn);
  return {
    schema: SCHEMA_VERSION,
    programmes: arr(r.programmes).map(
      (p): Programme => ({
        id: id(p.id, 'p-'),
        title: str(p.title, 'Programme'),
        institution: str(p.institution),
        awardLevel: str(p.awardLevel),
        durationYears: Math.max(1, Math.round(num(p.durationYears, 1))),
        totalHours: num(p.totalHours),
        overview: str(p.overview),
        entryRequirements: str(p.entryRequirements),
        assessmentPolicy: str(p.assessmentPolicy),
        sourceReferenceId: str(p.sourceReferenceId) || undefined,
        createdAt: str(p.createdAt, t),
        updatedAt: str(p.updatedAt, t),
      }),
    ),
    classes: arr(r.classes).map(
      (c): ClassGroup => ({
        id: id(c.id, 'cl-'),
        programmeId: str(c.programmeId) || undefined,
        name: str(c.name, 'Class'),
        year: Math.max(1, Math.round(num(c.year, 1))),
        intake: str(c.intake),
        academicYear: str(c.academicYear, settings.academicYear),
        notes: str(c.notes),
        createdAt: str(c.createdAt, t),
      }),
    ),
    units: arr(r.units).map(normUnit),
    notes: arr(r.notes).map(
      (n): Note => ({
        id: id(n.id, 'n-'),
        unitId: str(n.unitId),
        topicId: str(n.topicId) || undefined,
        title: str(n.title, 'Lecture notes'),
        markdown: str(n.markdown),
        hourStart: num(n.hourStart, 1),
        hourEnd: num(n.hourEnd, num(n.hourStart, 1)),
        status: oneOf(n.status, ['draft', 'final'] as const, 'draft'),
        sourceIds: strs(n.sourceIds),
        model: str(n.model),
        createdAt: str(n.createdAt, t),
        updatedAt: str(n.updatedAt, t),
      }),
    ),
    references: arr(r.references).map(
      (x): Reference => ({
        id: id(x.id, 'r-'),
        name: str(x.name, 'Document'),
        category: oneOf(x.category, ['curriculum', 'textbook', 'guideline', 'past_paper', 'notes', 'image', 'other'] as const, 'other'),
        mime: str(x.mime),
        size: num(x.size),
        text: str(x.text),
        pages: num(x.pages),
        ocrPages: num(x.ocrPages),
        unitIds: strs(x.unitIds),
        addedAt: str(x.addedAt, t),
      }),
    ),
    papers: arr(r.papers).map(
      (p): Paper => ({
        id: id(p.id, 'pp-'),
        unitId: str(p.unitId),
        kind: oneOf(p.kind, ['exam', 'coursework', 'assignment', 'test', 'quiz', 'practical'] as const, 'exam'),
        title: str(p.title, 'Assessment'),
        instructions: str(p.instructions),
        duration: str(p.duration),
        academicYear: str(p.academicYear, settings.academicYear),
        sections: arr(p.sections).map((sec) => ({
          id: id(sec.id, 's-'),
          title: str(sec.title, 'Section'),
          type: oneOf(sec.type, QUESTION_TYPES, 'short'),
          instructions: str(sec.instructions),
          choose: Math.max(0, Math.round(num(sec.choose))),
          questions: arr(sec.questions).map(normQuestion),
        })),
        topicIds: strs(p.topicIds),
        formatId: str(p.formatId) || undefined,
        status: oneOf(p.status, ['draft', 'final'] as const, 'draft'),
        model: str(p.model),
        createdAt: str(p.createdAt, t),
        updatedAt: str(p.updatedAt, t),
      }),
    ),
    formats,
    bank: arr(r.bank).map(
      (q): BankQuestion => ({
        ...normQuestion(q),
        unitId: str(q.unitId),
        topicId: str(q.topicId) || undefined,
        source: oneOf(q.source, ['ai', 'paper', 'manual'] as const, 'manual'),
        createdAt: str(q.createdAt, t),
      }),
    ),
    students: arr(r.students).map(normStudent),
    marks: arr(r.marks)
      .map(
        (m): MarkEntry => ({
          id: id(m.id, 'm-'),
          studentId: str(m.studentId),
          unitId: str(m.unitId),
          componentId: str(m.componentId),
          score: m.score === null || m.score === undefined || m.score === '' ? null : num(m.score, NaN),
          paperId: str(m.paperId) || undefined,
          remark: str(m.remark),
          updatedAt: str(m.updatedAt, t),
        }),
      )
      .filter((m) => m.studentId && m.unitId && m.componentId && (m.score === null || Number.isFinite(m.score))),
    chats: arr(r.chats).map(
      (c): Chat => ({
        id: id(c.id, 'ch-'),
        kind: oneOf(c.kind, ['solve', 'tutor', 'research'] as const, 'solve'),
        title: str(c.title, 'Conversation'),
        unitId: str(c.unitId) || undefined,
        messages: arr(c.messages).map((m) => ({
          id: id(m.id, 'msg-'),
          role: oneOf(m.role, ['user', 'assistant'] as const, 'user'),
          content: str(m.content),
          attachments: arr(m.attachments).map((a) => ({
            kind: oneOf(a.kind, ['image', 'document', 'voice'] as const, 'document'),
            name: str(a.name),
          })),
          model: str(m.model) || undefined,
          sources: arr(m.sources).map((x) => ({ title: str(x.title), url: str(x.url), provider: str(x.provider) || undefined })),
          error: Boolean(m.error) || undefined,
          createdAt: str(m.createdAt, t),
        })),
        createdAt: str(c.createdAt, t),
        updatedAt: str(c.updatedAt, t),
      }),
    ),
    settings,
    updatedAt: str(r.updatedAt, t),
  };
}

export function normStudent(s: Raw): Student {
  const t = now();
  return {
    id: id(s.id, 'st-'),
    regNo: str(s.regNo),
    firstName: str(s.firstName),
    lastName: str(s.lastName),
    otherNames: str(s.otherNames),
    gender: oneOf(s.gender, ['Female', 'Male', 'Other', ''] as const, ''),
    dateOfBirth: str(s.dateOfBirth),
    nationalId: str(s.nationalId),
    phone: str(s.phone),
    email: str(s.email),
    address: str(s.address),
    nationality: str(s.nationality),
    guardianName: str(s.guardianName),
    guardianPhone: str(s.guardianPhone),
    guardianRelation: str(s.guardianRelation),
    classId: str(s.classId),
    admissionDate: str(s.admissionDate),
    sponsorship: str(s.sponsorship),
    status: oneOf(s.status, ['Active', 'Suspended', 'Deferred', 'Discontinued', 'Completed', 'Graduated'] as const, 'Active'),
    notes: str(s.notes),
    createdAt: str(s.createdAt, t),
    updatedAt: str(s.updatedAt, t),
  };
}

export const fullName = (s: Pick<Student, 'firstName' | 'lastName' | 'otherNames'>): string =>
  [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(' ') || 'Unnamed student';

export const unitLabel = (u: Pick<Unit, 'code' | 'title'>): string => (u.code ? `${u.code} · ${u.title}` : u.title);

// ---------------------------------------------------------------------------
// Migration from Deep Tutor Pro 1.x (localStorage "deeptutor_*_v2" keys).
// ---------------------------------------------------------------------------

export function migrateLegacy(read: (key: string) => string | null): Workspace | null {
  const parse = (key: string): unknown => {
    try {
      const raw = read(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const pkg = parse('deeptutor_curriculum_package_v2');
  const students = parse('deeptutor_students_biodata_v2');
  const marks = parse('deeptutor_student_marks_v2');
  const notes = parse('deeptutor_lecture_notes_v2');
  const refs = parse('deeptutor_reference_docs_v2');
  if (!isObj(pkg) && !Array.isArray(students) && !Array.isArray(refs)) return null;

  // The 1.x app shipped a fixed "demo" pharmacy sample; only real user data is carried over.
  const isDemo = isObj(pkg) && str(pkg.id) === 'curr-pharm-01';
  const ws = emptyWorkspace();
  const t = now();
  if (isObj(pkg) && !isDemo) {
    const programme: Programme = {
      id: uid('p-'),
      title: str(pkg.title, 'Programme'),
      institution: str(pkg.institution),
      awardLevel: str(pkg.level),
      durationYears: Math.max(1, Math.round(num(pkg.durationYears, 1))),
      totalHours: num(pkg.totalCurriculumHours),
      overview: str(pkg.overviewSummary),
      entryRequirements: '',
      assessmentPolicy: '',
      createdAt: t,
      updatedAt: t,
    };
    ws.programmes.push(programme);
    for (const cu of arr(pkg.courseUnits)) {
      ws.units.push({
        ...normUnit({}),
        id: str(cu.id) || uid('u-'),
        programmeId: programme.id,
        code: str(cu.code),
        title: str(cu.title, 'Unit'),
        year: Math.max(1, Math.round(num(cu.yearOfStudy, 1))),
        semester: Math.round(num(cu.semester, 1)),
        creditUnits: num(cu.creditUnits),
        hours: {
          lecture: num(cu.lectureHours),
          tutorial: num(cu.tutorialHours),
          practical: num(cu.practicalHours),
          clinical: 0,
          total: num(cu.totalContactHours),
        },
        overview: str(cu.courseOverview),
        aims: strs(cu.generalObjectives),
        topics: arr(cu.topics).map((tp) =>
          normTopic({ id: tp.id, title: tp.title, hours: tp.allocatedHours, objectives: tp.learningObjectives, subtopics: tp.subtopics, practicals: tp.suggestedPracticals }),
        ),
        analysed: true,
      });
    }
    for (let y = 1; y <= programme.durationYears; y += 1) {
      ws.classes.push({ id: uid('cl-'), programmeId: programme.id, name: `${programme.title} — Year ${y}`, year: y, intake: '', academicYear: ws.settings.academicYear, notes: '', createdAt: t });
    }
  }
  if (Array.isArray(notes) && !isDemo) {
    for (const n of arr(notes)) {
      const md = [`# ${str(n.title)}`, str(n.theoreticalContent), str(n.workedExamplesOrCases), str(n.clinicalOrLabPracticum)].filter(Boolean).join('\n\n');
      ws.notes.push({ id: str(n.id) || uid('n-'), unitId: str(n.courseUnitId), topicId: str(n.topicId) || undefined, title: str(n.title, 'Lecture notes'), markdown: md, hourStart: 1, hourEnd: 1, status: 'draft', sourceIds: [], model: '', createdAt: t, updatedAt: t });
    }
  }
  if (Array.isArray(refs)) {
    for (const r of arr(refs)) {
      if (str(r.id).startsWith('ref-demo')) continue;
      ws.references.push({ id: str(r.id) || uid('r-'), name: str(r.name, 'Document'), category: 'other', mime: '', size: 0, text: str(r.extractedText), pages: 0, ocrPages: 0, unitIds: [], addedAt: str(r.uploadedAt, t) });
    }
  }
  if (Array.isArray(students) && !isDemo) {
    const byCohort = new Map<string, string>();
    for (const s of arr(students)) {
      const cohort = str(s.classCohort, `Year ${num(s.yearOfStudy, 1)}`);
      if (!byCohort.has(cohort)) {
        const cls: ClassGroup = { id: uid('cl-'), name: cohort, year: Math.max(1, Math.round(num(s.yearOfStudy, 1))), intake: '', academicYear: ws.settings.academicYear, notes: '', createdAt: t };
        ws.classes.push(cls);
        byCohort.set(cohort, cls.id);
      }
      const [firstName, ...rest] = str(s.fullName).split(/\s+/);
      ws.students.push(
        normStudent({
          id: s.id,
          regNo: s.regNumber,
          firstName,
          lastName: rest.pop() ?? '',
          otherNames: rest.join(' '),
          gender: s.gender,
          dateOfBirth: s.dateOfBirth,
          phone: s.contactPhone,
          email: s.email,
          address: s.homeDistrictAddress,
          guardianName: s.nextOfKinName,
          guardianPhone: s.nextOfKinPhone,
          guardianRelation: s.nextOfKinRelationship,
          classId: byCohort.get(cohort),
          status: s.enrollmentStatus === 'On Leave' ? 'Deferred' : s.enrollmentStatus,
        }),
      );
    }
    if (Array.isArray(marks)) {
      const map: [string, string][] = [
        ['cat1Score', 'cat1'],
        ['cat2Score', 'cat2'],
        ['assignmentScore', 'assign'],
        ['finalExamScore', 'exam'],
      ];
      const max: Record<string, number> = { cat1Score: 15, cat2Score: 15, assignmentScore: 10, finalExamScore: 100 };
      for (const m of arr(marks)) {
        for (const [field, comp] of map) {
          // Blank or unreadable 1.x scores stay unentered; they must not become a 0 mark.
          const raw = num(m[field], NaN);
          if (!Number.isFinite(raw)) continue;
          ws.marks.push({ id: uid('m-'), studentId: str(m.studentId), unitId: str(m.courseUnitId), componentId: comp, score: Math.round((raw / max[field]) * 1000) / 10, remark: str(m.remarks), updatedAt: t });
        }
      }
    }
  }
  if (!ws.units.length && !ws.students.length && !ws.references.length && !ws.notes.length) return null;
  return ws;
}
