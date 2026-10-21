import { describe, expect, it } from 'vitest';
import {
  blankQuestion,
  formatTotal,
  fromServerSections,
  numbered,
  paperMarks,
  paperToMarkdown,
  pickFromBank,
  questionCount,
  sectionMarks,
  toBank,
} from '../src/lib/papers';
import { BUILTIN_FORMATS, normQuestion } from '../src/lib/workspace';
import { parseMarkdown } from '../src/lib/markdown';
import type { BankQuestion, Paper, PaperSection, Question } from '../src/lib/model';

const q = (id: string, marks: number, extra: Partial<Question> = {}): Question => normQuestion({ id, marks, prompt: `Question ${id}`, ...extra });
const section = (id: string, questions: Question[], choose = 0, extra: Partial<PaperSection> = {}): PaperSection => ({
  id,
  title: `Section ${id}`,
  type: 'short',
  instructions: '',
  choose,
  questions,
  ...extra,
});

const paper: Paper = {
  id: 'p1',
  unitId: 'u1',
  kind: 'exam',
  title: 'End of semester',
  instructions: 'Answer ALL questions in Section A. Answer any TWO questions in Section B.',
  duration: '3 hours',
  academicYear: '2026/2027',
  sections: [
    section('A', [
      q('mcq1', 1, { type: 'mcq', prompt: 'Which drug is an analgesic?', options: ['Paracetamol', 'Amoxicillin', 'Insulin'], answerIndex: 0, solution: 'Paracetamol relieves pain.' }),
      q('short1', 5, { prompt: 'Define pharmacy.', answer: 'The art and science\nof preparing drugs', markingPoints: [{ point: 'Art | science', marks: 2 }, { point: 'Preparing drugs', marks: 3 }] }),
    ], 0, { instructions: 'Answer all questions.' }),
    section('B', [q('e1', 15, { prompt: 'Essay one' }), q('e2', 10, { prompt: 'Essay two' }), q('e3', 20, { prompt: 'Essay three' })], 2),
  ],
  topicIds: [],
  status: 'draft',
  model: '',
  createdAt: '',
  updatedAt: '',
};

describe('marks', () => {
  it('counts the best N questions when candidates choose', () => {
    expect(sectionMarks(paper.sections[1])).toBe(35); // 20 + 15
    expect(sectionMarks(paper.sections[0])).toBe(6);
    expect(paperMarks(paper)).toBe(41);
    expect(questionCount(paper)).toBe(5);
  });
  it('treats choose larger than the question count as all, and empty sections as zero', () => {
    expect(sectionMarks(section('x', [q('a', 3), q('b', 4)], 5))).toBe(7);
    expect(sectionMarks(section('y', []))).toBe(0);
    expect(paperMarks({ sections: [] })).toBe(0);
  });
  it('numbers questions through the whole paper', () => {
    expect(numbered(paper).map((n) => [n.number, n.question.id, n.section.id])).toEqual([
      [1, 'mcq1', 'A'],
      [2, 'short1', 'A'],
      [3, 'e1', 'B'],
      [4, 'e2', 'B'],
      [5, 'e3', 'B'],
    ]);
  });
  it('formatTotal uses choose (best N) over count', () => {
    expect(formatTotal(BUILTIN_FORMATS.find((f) => f.id === 'fmt-standard')!)).toBe(100);
    expect(formatTotal(BUILTIN_FORMATS.find((f) => f.id === 'fmt-cat')!)).toBe(40);
  });
});

describe('paperToMarkdown', () => {
  const ctx = { unit: { code: 'PHA 101', title: 'Pharmaceutics', year: 1 }, programme: 'Diploma in Pharmacy' };

  it('paper mode shows options and instructions but no answers', () => {
    const md = paperToMarkdown(paper, ctx, 'paper');
    expect(md).toContain('| Course unit | PHA 101 — Pharmaceutics |');
    expect(md).toContain('| Total marks | 41 |');
    expect(md).toContain('| Time allowed | 3 hours |');
    expect(md).toContain('## Instructions to candidates');
    expect(md).toContain('- Answer ALL questions in Section A.');
    expect(md).toContain('- Answer any TWO questions in Section B.');
    expect(md).toContain('## Section B (35 marks)');
    expect(md).toContain('*Answer all questions.*');
    expect(md).toContain('**1.** Which drug is an analgesic? **(1 mark)**');
    expect(md).toContain('**2.** Define pharmacy. **(5 marks)**');
    expect(md).toContain('- A. Paracetamol');
    expect(md).toContain('- C. Insulin');
    expect(md).toContain('*END OF PAPER*');
    expect(md).not.toContain('Answer:');
    expect(md).not.toContain('Marking point');
    expect(md).not.toContain('relieves pain');
    expect(md).not.toContain('# Marking scheme');
  });

  it('scheme mode shows answers and marking points but not the option list', () => {
    const md = paperToMarkdown(paper, ctx, 'scheme');
    expect(md.startsWith('| Paper | Details |')).toBe(true);
    expect(md).toContain('**Answer: A.** Paracetamol');
    expect(md).toContain('**Answer:** The art and science of preparing drugs');
    expect(md).toContain('| Marking point | Marks |');
    expect(md).toContain('| Art / science | 2 |'); // pipes escaped so the table is not broken
    expect(md).toContain('> Paracetamol relieves pain.');
    expect(md).not.toContain('- B. Amoxicillin');
    expect(md).not.toContain('Instructions to candidates');
    expect(md).not.toContain('END OF PAPER');
  });

  it('produces markdown whose header and marking tables parse correctly', () => {
    const tables = parseMarkdown(paperToMarkdown(paper, ctx, 'scheme')).filter((b) => b.type === 'table');
    expect(tables).toHaveLength(2);
    const marking = tables[1] as { rows: string[][] };
    expect(marking.rows).toEqual([
      ['Marking point', 'Marks'],
      ['Art / science', '2'],
      ['Preparing drugs', '3'],
    ]);
  });

  it('omits optional rows when context is missing and formats fractional marks', () => {
    const md = paperToMarkdown({ ...paper, duration: '', instructions: '', sections: [section('Z', [q('h', 2.5)])] }, {}, 'paper');
    expect(md).not.toContain('Course unit');
    expect(md).not.toContain('Programme');
    expect(md).not.toContain('Time allowed');
    expect(md).toContain('**(2.5 marks)**');
    expect(md).toContain('| Total marks | 2.5 |');
  });
});

describe('server conversion and bank', () => {
  it('normalises server sections (unknown types, bad answer index)', () => {
    const [s] = fromServerSections([
      {
        title: 'A',
        type: 'riddle',
        instructions: 'x',
        choose: 0,
        questions: [{ type: 'mcq', prompt: 'p', options: ['a', 'b'], answer_index: 5, answer: '', solution: '', marking_points: [{ point: 'k', marks: 2 }], marks: 1, topic: 'T', difficulty: 'easy', outcome: '' }],
      },
    ]);
    expect(s.type).toBe('short');
    expect(s.id).toBeTruthy();
    expect(s.questions[0]).toMatchObject({ type: 'mcq', answerIndex: null, markingPoints: [{ point: 'k', marks: 2 }] });
  });

  it('blankQuestion gives sensible defaults per type', () => {
    expect(blankQuestion('mcq')).toMatchObject({ options: ['', '', '', ''], marks: 1 });
    expect(blankQuestion('true_false').options).toEqual(['True', 'False']);
    expect(blankQuestion('essay')).toMatchObject({ options: [], marks: 5 });
  });

  it('pickFromBank prefers chosen topics, then fills from the rest, with fresh ids', () => {
    const bank: BankQuestion[] = [
      toBank(q('1', 1, { type: 'mcq', topic: 'Pain' }), 'u1', 'ai'),
      toBank(q('2', 1, { type: 'mcq', topic: 'Infection' }), 'u1', 'ai'),
      toBank(q('3', 1, { type: 'mcq', topic: 'pain' }), 'u1', 'manual'),
      toBank(q('4', 1, { type: 'short', topic: 'Pain' }), 'u1', 'ai'),
      toBank(q('5', 1, { type: 'mcq', topic: 'Pain' }), 'u2', 'ai'),
    ];
    const picked = pickFromBank(bank, 'u1', 'mcq', 3, ['PAIN']);
    expect(picked.map((x) => x.prompt)).toEqual(['Question 1', 'Question 3', 'Question 2']);
    expect(picked.every((x) => !bank.some((b) => b.id === x.id))).toBe(true);
    expect(pickFromBank(bank, 'u1', 'mcq', 1, [])).toHaveLength(1);
    expect(pickFromBank(bank, 'u9', 'mcq', 5, [])).toEqual([]);
  });
});
