import { describe, expect, it } from 'vitest';
import {
  BUILTIN_FORMATS,
  DEFAULT_BANDS,
  DEFAULT_COMPONENTS,
  currentAcademicYear,
  emptyWorkspace,
  fullName,
  migrateLegacy,
  normalizeWorkspace,
  unitLabel,
} from '../src/lib/workspace';
import { SCHEMA_VERSION } from '../src/lib/model';

const T = '2026-03-01T10:00:00.000Z';

/** A realistic saved workspace where every item has an id and timestamps. */
function sample() {
  return {
    schema: 2,
    updatedAt: T,
    programmes: [{ id: 'p1', title: 'Diploma in Pharmacy', institution: 'School', awardLevel: 'Diploma', durationYears: 3, totalHours: 3000, overview: '', entryRequirements: '', assessmentPolicy: '', createdAt: T, updatedAt: T }],
    classes: [{ id: 'c1', programmeId: 'p1', name: 'Year 1', year: 1, intake: '2026', academicYear: '2026/2027', notes: '', createdAt: T }],
    units: [
      {
        id: 'u1',
        programmeId: 'p1',
        code: 'PHA 101',
        title: 'Pharmaceutics',
        year: 1,
        semester: 2,
        creditUnits: 4,
        hours: { lecture: 30, tutorial: 10, practical: 20, clinical: 0, total: 60 },
        overview: 'o',
        aims: ['a'],
        outcomes: ['b'],
        topics: [{ id: 't1', title: 'Dosage forms', hours: 3, objectives: ['x'], subtopics: ['y'], practicals: 'z' }],
        teachingMethods: ['Lecture'],
        assessment: 'CAT',
        references: ['Ref'],
        hoursEstimated: false,
        referenceIds: ['r1'],
        analysed: true,
        createdAt: T,
        updatedAt: T,
      },
    ],
    notes: [{ id: 'n1', unitId: 'u1', topicId: 't1', title: 'Notes', markdown: '# Hi', hourStart: 1, hourEnd: 3, status: 'final', sourceIds: ['r1'], model: 'gemini', createdAt: T, updatedAt: T }],
    references: [{ id: 'r1', name: 'Book.pdf', category: 'textbook', mime: 'application/pdf', size: 100, text: 'text', pages: 2, ocrPages: 1, unitIds: ['u1'], addedAt: T }],
    papers: [
      {
        id: 'pp1',
        unitId: 'u1',
        kind: 'coursework',
        title: 'CAT 1',
        instructions: 'Answer all',
        duration: '1 hour',
        academicYear: '2026/2027',
        sections: [
          {
            id: 's1',
            title: 'Section A',
            type: 'mcq',
            instructions: '',
            choose: 0,
            questions: [{ id: 'q1', type: 'mcq', prompt: 'Pick', options: ['A', 'B'], answerIndex: 1, answer: '', solution: '', markingPoints: [{ point: 'p', marks: 1 }], marks: 1, topic: 't', difficulty: 'easy', outcome: '' }],
          },
        ],
        topicIds: ['t1'],
        formatId: 'fmt-cat',
        status: 'draft',
        model: '',
        createdAt: T,
        updatedAt: T,
      },
    ],
    formats: [{ id: 'fmt-mine', name: 'Mine', duration: '2h', instructions: '', styleNotes: '', builtIn: false, createdAt: T, sections: [{ title: 'A', type: 'essay', count: 2, marksEach: 10, choose: 1, instructions: '' }] }],
    bank: [{ id: 'b1', type: 'short', prompt: 'Define', options: [], answerIndex: null, answer: 'x', solution: '', markingPoints: [], marks: 5, topic: '', difficulty: 'moderate', outcome: '', unitId: 'u1', source: 'ai', createdAt: T }],
    students: [{ id: 'st1', regNo: 'R1', firstName: 'Jane', lastName: 'Doe', otherNames: '', gender: 'Female', classId: 'c1', status: 'Active', createdAt: T, updatedAt: T }],
    marks: [{ id: 'm1', studentId: 'st1', unitId: 'u1', componentId: 'cat1', score: 75, remark: '', updatedAt: T }],
    chats: [{ id: 'ch1', kind: 'tutor', title: 'Chat', messages: [{ id: 'msg1', role: 'assistant', content: 'Hello', attachments: [{ kind: 'image', name: 'a.png' }], sources: [{ title: 'S', url: 'u' }], createdAt: T }], createdAt: T, updatedAt: T }],
    settings: {
      institution: 'School',
      tutorName: 'Tutor',
      department: 'Pharmacy',
      academicYear: '2026/2027',
      provider: 'gemini',
      noteDetail: 'comprehensive',
      components: [{ id: 'cat1', name: 'CAT 1', kind: 'coursework', weight: 40, maxScore: 30 }],
      bands: [{ min: 0, grade: 'F', points: 0, remark: 'Fail' }, { min: 50, grade: 'P', points: 1, remark: 'Pass' }],
      passMark: 50,
      autoSync: false,
      theme: 'light',
    },
  };
}

describe('emptyWorkspace / helpers', () => {
  it('starts with the built-in formats and default grading', () => {
    const ws = emptyWorkspace();
    expect(ws.schema).toBe(SCHEMA_VERSION);
    expect(ws.formats.map((f) => f.id)).toEqual(BUILTIN_FORMATS.map((f) => f.id));
    expect(ws.settings.components.reduce((s, c) => s + c.weight, 0)).toBe(100);
    // defaults are copies, editing them must not change the shared constants
    ws.settings.components[0].weight = 99;
    ws.formats[0].sections[0].count = 1;
    expect(DEFAULT_COMPONENTS[0].weight).toBe(15);
    expect(BUILTIN_FORMATS[0].sections[0].count).toBe(30);
  });
  it('computes the academic year from July', () => {
    expect(currentAcademicYear(new Date(2026, 6, 1))).toBe('2026/2027');
    expect(currentAcademicYear(new Date(2026, 5, 30))).toBe('2025/2026');
  });
  it('formats names and unit labels', () => {
    expect(fullName({ firstName: 'Jane', otherNames: 'M', lastName: 'Doe' })).toBe('Jane M Doe');
    expect(fullName({ firstName: '', otherNames: '', lastName: '' })).toBe('Unnamed student');
    expect(unitLabel({ code: 'PHA 101', title: 'X' })).toBe('PHA 101 · X');
    expect(unitLabel({ code: '', title: 'X' })).toBe('X');
  });
});

describe('normalizeWorkspace', () => {
  it.each([null, undefined, 42, 'workspace', [], [1, 2], true, () => 1])('returns an empty workspace for %s', (input) => {
    const ws = normalizeWorkspace(input);
    expect(ws.units).toEqual([]);
    expect(ws.formats).toHaveLength(BUILTIN_FORMATS.length);
    expect(ws.settings.bands).toEqual(DEFAULT_BANDS);
  });

  it('never throws on collections of the wrong type or garbage items', () => {
    const garbage = {
      programmes: 'nope',
      classes: { 0: 'x' },
      units: [null, 1, 'u', [], { title: 42, year: '-3', hours: 'lots', topics: 'none', aims: [1, null, 'ok'] }],
      notes: [undefined, { hourStart: 'abc' }],
      references: [{ category: 'secret', size: 'big' }],
      papers: [{ sections: [null, { questions: [null, { options: 'A,B', answerIndex: 9, marks: -5, type: 'weird' }] }] }],
      formats: [{ id: 'fmt-standard', name: 'Edited standard', sections: [{ count: 0, marksEach: 'x', type: 'bogus' }] }, 5],
      bank: [{ source: 'stolen' }],
      students: [null, 1, 'x', { firstName: 'Ann', gender: 'robot', status: 'Expelled' }],
      chats: [{ messages: [null, { role: 'system', attachments: [{ kind: 'video' }] }] }],
      settings: { components: [{ weight: 'heavy', maxScore: 0 }, null], bands: 'A-F', passMark: 'fifty', theme: 'neon', provider: 'skynet' },
      updatedAt: 12345,
    };
    expect(() => normalizeWorkspace(garbage)).not.toThrow();
    const ws = normalizeWorkspace(garbage);
    expect(ws.programmes).toEqual([]);
    expect(ws.classes).toEqual([]);
    expect(ws.units).toHaveLength(1);
    expect(ws.units[0]).toMatchObject({ title: '42', year: 1, topics: [], aims: ['1', 'ok'] });
    expect(ws.units[0].hours).toEqual({ lecture: 0, tutorial: 0, practical: 0, clinical: 0, total: 0 });
    expect(ws.units[0].id).toMatch(/^u-/);
    expect(ws.notes[0]).toMatchObject({ hourStart: 1, hourEnd: 1, status: 'draft' });
    expect(ws.references[0]).toMatchObject({ category: 'other', size: 0 });
    const q = ws.papers[0].sections[0].questions[0];
    expect(q).toMatchObject({ options: [], answerIndex: null, marks: 0, type: 'short' });
    const std = ws.formats.find((f) => f.id === 'fmt-standard')!;
    expect(std.name).toBe('Edited standard'); // a user's edit of a built-in format is kept, not duplicated
    expect(std.sections[0]).toMatchObject({ count: 1, marksEach: 1, type: 'short' });
    expect(ws.formats.filter((f) => f.id === 'fmt-standard')).toHaveLength(1);
    expect(ws.formats.map((f) => f.id)).toEqual(expect.arrayContaining(['fmt-cat', 'fmt-assignment']));
    expect(ws.bank[0].source).toBe('manual');
    expect(ws.students).toHaveLength(1);
    expect(ws.students[0]).toMatchObject({ firstName: 'Ann', gender: '', status: 'Active' });
    expect(ws.chats[0].messages[0]).toMatchObject({ role: 'user', attachments: [{ kind: 'document', name: '' }] });
    expect(ws.settings.components).toEqual([{ id: expect.any(String), name: 'Component', kind: 'other', weight: 0, maxScore: 1 }]);
    expect(ws.settings.bands).toEqual(DEFAULT_BANDS);
    expect(ws.settings).toMatchObject({ passMark: 50, theme: 'dark', provider: 'auto', autoSync: true });
    expect(ws.updatedAt).toBe('12345');
  });

  it('drops invalid marks but keeps valid and blank ones', () => {
    const ws = normalizeWorkspace({
      marks: [
        { id: 'ok', studentId: 's', unitId: 'u', componentId: 'c', score: 75 },
        { id: 'str', studentId: 's', unitId: 'u', componentId: 'c2', score: '62.5' },
        { id: 'blank', studentId: 's', unitId: 'u', componentId: 'c3', score: null },
        { id: 'empty', studentId: 's', unitId: 'u', componentId: 'c4', score: '' },
        { id: 'zero', studentId: 's', unitId: 'u', componentId: 'c5', score: 0 },
        { id: 'nan', studentId: 's', unitId: 'u', componentId: 'c', score: Number.NaN },
        { id: 'nanstr', studentId: 's', unitId: 'u', componentId: 'c', score: 'NaN' },
        { id: 'text', studentId: 's', unitId: 'u', componentId: 'c', score: 'absent' },
        { id: 'inf', studentId: 's', unitId: 'u', componentId: 'c', score: Number.POSITIVE_INFINITY },
        { id: 'obj', studentId: 's', unitId: 'u', componentId: 'c', score: { v: 1 } },
        { id: 'nostudent', unitId: 'u', componentId: 'c', score: 50 },
        { id: 'nounit', studentId: 's', componentId: 'c', score: 50 },
        { id: 'nocomp', studentId: 's', unitId: 'u', score: 50 },
        null,
        'mark',
      ],
    });
    expect(ws.marks.map((m) => [m.id, m.score])).toEqual([
      ['ok', 75],
      ['str', 62.5],
      ['blank', null],
      ['empty', null],
      ['zero', 0],
    ]);
  });

  it('keeps valid data intact', () => {
    const input = sample();
    const ws = normalizeWorkspace(input);
    expect(ws.schema).toBe(SCHEMA_VERSION);
    expect(ws.units[0]).toEqual({ ...input.units[0] });
    expect(ws.notes[0]).toEqual(input.notes[0]);
    expect(ws.references[0]).toEqual(input.references[0]);
    expect(ws.papers[0].sections[0].questions[0]).toEqual(input.papers[0].sections[0].questions[0]);
    expect(ws.marks).toEqual(input.marks);
    expect(ws.students[0]).toMatchObject(input.students[0]);
    expect(ws.settings).toMatchObject({ institution: 'School', provider: 'gemini', noteDetail: 'comprehensive', autoSync: false, theme: 'light' });
    expect(ws.settings.components).toEqual(input.settings.components);
    // bands are sorted highest first so grading picks the right one
    expect(ws.settings.bands.map((b) => b.grade)).toEqual(['P', 'F']);
    // the custom format is kept and the built-ins are re-added
    expect(ws.formats.map((f) => f.id)).toEqual(['fmt-mine', ...BUILTIN_FORMATS.map((f) => f.id)]);
    expect(ws.chats[0].messages[0]).toMatchObject({ content: 'Hello', sources: [{ title: 'S', url: 'u' }] });
    expect(ws.updatedAt).toBe(T);
  });

  it('is idempotent', () => {
    const once = normalizeWorkspace(sample());
    const twice = normalizeWorkspace(once);
    expect(twice).toEqual(once);
    expect(normalizeWorkspace(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });

  it('does not mutate its input', () => {
    const input = sample();
    const copy = structuredClone(input);
    normalizeWorkspace(input);
    expect(input).toEqual(copy);
  });

  it('clamps an answer index outside the options to null and keeps a valid one', () => {
    const ws = normalizeWorkspace({ bank: [{ id: 'a', options: ['x', 'y'], answerIndex: 2 }, { id: 'b', options: ['x', 'y'], answerIndex: '1' }, { id: 'c', options: ['x'], answerIndex: -1 }] });
    expect(ws.bank.map((q) => q.answerIndex)).toEqual([null, 1, null]);
  });
});

// ---------------------------------------------------------------------------

function storage(entries: Record<string, unknown>) {
  const map = new Map(Object.entries(entries).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  return (k: string) => map.get(k) ?? null;
}

const legacyPkg = {
  id: 'curr-nursing-77',
  title: 'Certificate in Nursing',
  institution: 'Kampala School',
  level: 'Certificate',
  durationYears: 2,
  totalCurriculumHours: 2400,
  overviewSummary: 'Overview text',
  courseUnits: [
    {
      id: 'cu1',
      code: 'NUR 101',
      title: 'Fundamentals of Nursing',
      yearOfStudy: 1,
      semester: 1,
      creditUnits: 4,
      lectureHours: 30,
      tutorialHours: 10,
      practicalHours: 20,
      totalContactHours: 60,
      courseOverview: 'Basics',
      generalObjectives: ['Care for patients'],
      topics: [{ id: 'tp1', title: 'Hygiene', allocatedHours: 4, learningObjectives: ['Wash hands'], subtopics: ['Hand washing'], suggestedPracticals: 'Demo' }],
    },
  ],
};
const legacyStudents = [
  { id: 'st1', regNumber: 'N/2024/001', fullName: 'Jane Mary Doe', gender: 'Female', classCohort: 'Nursing 2024', yearOfStudy: 1, contactPhone: '0700', email: 'jane@example.com', nextOfKinName: 'John', nextOfKinPhone: '0701', nextOfKinRelationship: 'Father', enrollmentStatus: 'On Leave' },
  { id: 'st2', regNumber: 'N/2024/002', fullName: 'Peter', gender: 'Male', classCohort: 'Nursing 2024', yearOfStudy: 1, enrollmentStatus: 'Active' },
  { id: 'st3', regNumber: 'N/2023/010', fullName: 'Old Timer', yearOfStudy: 2 },
];
const legacyMarks = [
  { studentId: 'st1', courseUnitId: 'cu1', cat1Score: 12, cat2Score: 7.5, assignmentScore: 10, finalExamScore: 64, remarks: 'Good' },
  { studentId: 'st2', courseUnitId: 'cu1', cat1Score: 15 },
];

describe('migrateLegacy', () => {
  it('returns null for empty storage', () => {
    expect(migrateLegacy(() => null)).toBeNull();
    expect(migrateLegacy(storage({}))).toBeNull();
  });

  it('survives corrupt JSON in any key', () => {
    const read = storage({ deeptutor_curriculum_package_v2: '{not json', deeptutor_students_biodata_v2: '[[[', deeptutor_reference_docs_v2: 'null' });
    expect(() => migrateLegacy(read)).not.toThrow();
    expect(migrateLegacy(read)).toBeNull();
  });

  it('does not import the 1.x demo pharmacy sample', () => {
    const read = storage({
      deeptutor_curriculum_package_v2: { ...legacyPkg, id: 'curr-pharm-01', title: 'Diploma in Pharmacy (demo)' },
      deeptutor_students_biodata_v2: legacyStudents,
      deeptutor_student_marks_v2: legacyMarks,
      deeptutor_lecture_notes_v2: [{ id: 'n1', title: 'Demo note', courseUnitId: 'cu1' }],
      deeptutor_reference_docs_v2: [{ id: 'ref-demo-1', name: 'Demo.pdf', extractedText: 'demo' }],
    });
    expect(migrateLegacy(read)).toBeNull();
  });

  it('keeps real uploads that sit next to the demo sample', () => {
    const read = storage({
      deeptutor_curriculum_package_v2: { ...legacyPkg, id: 'curr-pharm-01' },
      deeptutor_reference_docs_v2: [{ id: 'ref-demo-1', name: 'Demo.pdf' }, { id: 'ref-77', name: 'Mine.pdf', extractedText: 'my text', uploadedAt: T }],
    });
    const ws = migrateLegacy(read)!;
    expect(ws.programmes).toEqual([]);
    expect(ws.units).toEqual([]);
    expect(ws.references).toHaveLength(1);
    expect(ws.references[0]).toMatchObject({ id: 'ref-77', name: 'Mine.pdf', text: 'my text', addedAt: T });
  });

  it('converts real 1.x data: programme, units, topics, classes, students and marks', () => {
    const ws = migrateLegacy(
      storage({
        deeptutor_curriculum_package_v2: legacyPkg,
        deeptutor_students_biodata_v2: legacyStudents,
        deeptutor_student_marks_v2: legacyMarks,
        deeptutor_lecture_notes_v2: [{ id: 'n1', title: 'Hygiene notes', courseUnitId: 'cu1', topicId: 'tp1', theoreticalContent: 'Theory', workedExamplesOrCases: 'Case' }],
      }),
    )!;
    expect(ws).not.toBeNull();
    expect(ws.programmes).toHaveLength(1);
    const p = ws.programmes[0];
    expect(p).toMatchObject({ title: 'Certificate in Nursing', institution: 'Kampala School', awardLevel: 'Certificate', durationYears: 2, totalHours: 2400, overview: 'Overview text' });

    expect(ws.units).toHaveLength(1);
    const u = ws.units[0];
    expect(u).toMatchObject({ id: 'cu1', programmeId: p.id, code: 'NUR 101', title: 'Fundamentals of Nursing', year: 1, semester: 1, creditUnits: 4, overview: 'Basics', aims: ['Care for patients'], analysed: true });
    expect(u.hours).toEqual({ lecture: 30, tutorial: 10, practical: 20, clinical: 0, total: 60 });
    expect(u.topics).toEqual([{ id: 'tp1', title: 'Hygiene', hours: 4, objectives: ['Wash hands'], subtopics: ['Hand washing'], practicals: 'Demo' }]);

    // one class per programme year, plus one per 1.x cohort
    const names = ws.classes.map((c) => c.name);
    expect(names).toEqual(['Certificate in Nursing — Year 1', 'Certificate in Nursing — Year 2', 'Nursing 2024', 'Year 2']);

    expect(ws.students).toHaveLength(3);
    const jane = ws.students.find((s) => s.id === 'st1')!;
    expect(jane).toMatchObject({ regNo: 'N/2024/001', firstName: 'Jane', otherNames: 'Mary', lastName: 'Doe', gender: 'Female', phone: '0700', guardianName: 'John', guardianRelation: 'Father', status: 'Deferred' });
    expect(jane.classId).toBe(ws.classes.find((c) => c.name === 'Nursing 2024')!.id);
    const peter = ws.students.find((s) => s.id === 'st2')!;
    expect(peter).toMatchObject({ firstName: 'Peter', lastName: '', classId: jane.classId });
    expect(ws.students.find((s) => s.id === 'st3')!.classId).toBe(ws.classes.find((c) => c.name === 'Year 2')!.id);

    // 1.x stored raw marks (CAT out of 15, assignment out of 10); 2.x stores percentages.
    const m = (sid: string, comp: string) => ws.marks.find((x) => x.studentId === sid && x.componentId === comp)?.score;
    expect(m('st1', 'cat1')).toBe(80);
    expect(m('st1', 'cat2')).toBe(50);
    expect(m('st1', 'assign')).toBe(100);
    expect(m('st1', 'exam')).toBe(64);
    expect(m('st2', 'cat1')).toBe(100);
    expect(m('st2', 'exam')).toBeUndefined();
    expect(ws.marks.filter((x) => x.studentId === 'st2')).toHaveLength(1);
    expect(ws.marks.every((x) => x.unitId === 'cu1')).toBe(true);

    expect(ws.notes).toHaveLength(1);
    expect(ws.notes[0]).toMatchObject({ id: 'n1', unitId: 'cu1', topicId: 'tp1', markdown: '# Hygiene notes\n\nTheory\n\nCase' });

    // migrated data survives normalisation unchanged in substance
    const normalized = normalizeWorkspace(ws);
    expect(normalized.marks).toHaveLength(ws.marks.length);
    expect(normalized.students).toHaveLength(3);
  });

  it('does not turn blank or unreadable 1.x scores into zero marks', () => {
    const ws = migrateLegacy(
      storage({
        deeptutor_students_biodata_v2: [{ id: 'st1', fullName: 'A B' }],
        deeptutor_student_marks_v2: [{ studentId: 'st1', courseUnitId: 'cu1', cat1Score: null, cat2Score: '', assignmentScore: 'absent', finalExamScore: '50' }],
      }),
    )!;
    expect(ws.marks.map((m) => [m.componentId, m.score])).toEqual([['exam', 50]]);
  });
});
