import type { BankQuestion, ExamFormat, Paper, PaperSection, Question, QuestionType, Unit } from './model';
import { normQuestion, uid } from './workspace';

export const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  true_false: 'True / False',
  short: 'Short answer',
  structured: 'Structured',
  essay: 'Long essay',
  case: 'Case study',
  fill: 'Fill in the blank',
  matching: 'Matching',
  calculation: 'Calculation',
  practical: 'Practical / OSPE',
};

export const KIND_LABEL: Record<Paper['kind'], string> = {
  exam: 'End of semester examination',
  coursework: 'Continuous assessment test',
  assignment: 'Assignment',
  test: 'Class test',
  quiz: 'Quiz',
  practical: 'Practical assessment',
};

const letter = (i: number) => String.fromCharCode(65 + i);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Marks a candidate can score in a section (best N when they choose). */
export function sectionMarks(s: PaperSection): number {
  const marks = s.questions.map((q) => q.marks).sort((a, b) => b - a);
  return (s.choose ? marks.slice(0, s.choose) : marks).reduce((a, b) => a + b, 0);
}

export const paperMarks = (p: Pick<Paper, 'sections'>): number => p.sections.reduce((a, s) => a + sectionMarks(s), 0);

export const questionCount = (p: Pick<Paper, 'sections'>): number => p.sections.reduce((a, s) => a + s.questions.length, 0);

/** Question numbering runs through the whole paper (1, 2, 3, ...). */
export function numbered(p: Pick<Paper, 'sections'>): { section: PaperSection; question: Question; number: number }[] {
  let n = 0;
  return p.sections.flatMap((section) => section.questions.map((question) => ({ section, question, number: (n += 1) })));
}

export interface PaperContext {
  unit?: Pick<Unit, 'code' | 'title' | 'year'>;
  programme?: string;
  institution?: string;
}

export function paperToMarkdown(p: Paper, ctx: PaperContext, mode: 'paper' | 'scheme'): string {
  const out: string[] = [];
  const unit = ctx.unit ? `${ctx.unit.code ? ctx.unit.code + ' — ' : ''}${ctx.unit.title}` : '';
  out.push(
    `| Paper | Details |`,
    `|---|---|`,
    ...(ctx.programme ? [`| Programme | ${ctx.programme} |`] : []),
    ...(unit ? [`| Course unit | ${unit} |`] : []),
    `| Assessment | ${KIND_LABEL[p.kind]} |`,
    `| Academic year | ${p.academicYear} |`,
    ...(p.duration ? [`| Time allowed | ${p.duration} |`] : []),
    `| Total marks | ${fmt(paperMarks(p))} |`,
    '',
  );
  if (mode === 'paper' && p.instructions) {
    out.push('## Instructions to candidates', '');
    for (const line of p.instructions.split(/\n+|(?<=\.)\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean)) out.push(`- ${line}`);
    out.push('');
  }
  let n = 0;
  for (const s of p.sections) {
    out.push(`## ${s.title} (${fmt(sectionMarks(s))} marks)`, '');
    if (mode === 'paper' && s.instructions) out.push(`*${s.instructions}*`, '');
    for (const q of s.questions) {
      n += 1;
      const prompt = q.prompt.replace(/\n+/g, ' ');
      out.push(`**${n}.** ${prompt} **(${fmt(q.marks)} mark${q.marks === 1 ? '' : 's'})**`, '');
      if (q.options.length) {
        if (mode === 'paper') out.push(...q.options.map((o, i) => `- ${letter(i)}. ${o}`), '');
      }
      if (mode === 'scheme') {
        if (q.options.length && q.answerIndex !== null) out.push(`**Answer: ${letter(q.answerIndex)}.** ${q.options[q.answerIndex] ?? ''}`, '');
        else if (q.answer) out.push(`**Answer:** ${q.answer.replace(/\n+/g, ' ')}`, '');
        if (q.markingPoints.length) {
          out.push('| Marking point | Marks |', '|---|---|');
          for (const mp of q.markingPoints) out.push(`| ${mp.point.replace(/\|/g, '/')} | ${fmt(mp.marks)} |`);
          out.push('');
        }
        if (q.solution) out.push(`> ${q.solution.replace(/\n+/g, ' ')}`, '');
      }
    }
  }
  if (mode === 'paper') out.push('---', '', '*END OF PAPER*');
  return out.join('\n');
}

// Server (snake_case) → app shapes ------------------------------------------

type ServerQuestion = {
  type: string;
  prompt: string;
  options: string[];
  answer_index: number | null;
  answer: string;
  solution: string;
  marking_points: { point: string; marks: number }[];
  marks: number;
  topic: string;
  difficulty: string;
  outcome: string;
};

export function fromServerQuestion(q: ServerQuestion): Question {
  return normQuestion({
    id: uid('q-'),
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    answerIndex: q.answer_index,
    answer: q.answer,
    solution: q.solution,
    markingPoints: q.marking_points,
    marks: q.marks,
    topic: q.topic,
    difficulty: q.difficulty,
    outcome: q.outcome,
  });
}

export function fromServerSections(sections: { title: string; type: string; instructions: string; choose: number; questions: ServerQuestion[] }[]): PaperSection[] {
  return sections.map((s) => ({
    id: uid('s-'),
    title: s.title,
    type: normQuestion({ type: s.type }).type,
    instructions: s.instructions,
    choose: s.choose,
    questions: s.questions.map(fromServerQuestion),
  }));
}

export function formatTotal(f: Pick<ExamFormat, 'sections'>): number {
  return f.sections.reduce((a, s) => a + s.marksEach * (s.choose || s.count), 0);
}

export function blankQuestion(type: QuestionType = 'short'): Question {
  const options = type === 'mcq' ? ['', '', '', ''] : type === 'true_false' ? ['True', 'False'] : [];
  // normQuestion drops empty strings, so the blank MCQ option slots are set afterwards.
  return { ...normQuestion({ id: uid('q-'), type, prompt: '', marks: type === 'mcq' || type === 'true_false' ? 1 : 5 }), options };
}

export function toBank(q: Question, unitId: string, source: BankQuestion['source'], topicId?: string): BankQuestion {
  return { ...q, id: uid('bq-'), unitId, topicId, source, createdAt: new Date().toISOString() };
}

/** Pick questions from the bank for a section, preferring the chosen topics and unused items. */
export function pickFromBank(bank: BankQuestion[], unitId: string, type: QuestionType, count: number, topics: string[]): Question[] {
  const wanted = new Set(topics.map((t) => t.toLowerCase()));
  const pool = bank.filter((q) => q.unitId === unitId && q.type === type);
  const preferred = pool.filter((q) => !wanted.size || wanted.has(q.topic.toLowerCase()));
  const rest = pool.filter((q) => !preferred.includes(q));
  return [...preferred, ...rest].slice(0, count).map((q) => ({ ...q, id: uid('q-') }));
}
