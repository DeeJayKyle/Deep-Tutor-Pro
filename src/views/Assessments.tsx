import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookmarkPlus, ClipboardList, Copy, Download, ListChecks, Plus, RefreshCw, ScanText, Trash2, Upload, Wand2 } from 'lucide-react';
import type { ExamFormat, FormatSection, Paper, PaperKind, PaperSection, Question, QuestionType } from '../lib/model';
import { api } from '../lib/api';
import { ACCEPT } from '../lib/extract';
import { exportDocument } from '../lib/exporters';
import { hourRanges, sortUnits } from '../lib/curriculum';
import { blankQuestion, formatTotal, fromServerQuestion, fromServerSections, KIND_LABEL, numbered, paperMarks, paperToMarkdown, pickFromBank, questionCount, sectionMarks, toBank, TYPE_LABEL } from '../lib/papers';
import { now, uid, unitLabel } from '../lib/workspace';
import { navigate, useRoute } from '../state/router';
import { patch, remove, update, upsert, useWorkspace } from '../state/store';
import { aiProvider, docMeta, formatDate, plural, programmeTitle, sourcesFor, topicCtx, unitCtx, unitReferences } from '../state/helpers';
import { addReference } from '../state/library';
import { QuestionEditor } from '../ui/QuestionEditor';
import { A, Badge, Button, Card, Checkbox, EditableText, Empty, Field, FileButton, Input, LinkButton, Modal, Page, Select, Textarea, useAction, useUi } from '../ui/kit';

export default function AssessmentsView() {
  const route = useRoute();
  if (route.parts[1] === 'new') return <Builder />;
  if (route.parts[1]) return <PaperEditor id={route.parts[1]} />;
  return <PaperList />;
}

function PaperList() {
  const ws = useWorkspace();
  const [unitId, setUnitId] = useState('');
  const [kind, setKind] = useState<'' | PaperKind>('');
  const papers = ws.papers.filter((p) => (!unitId || p.unitId === unitId) && (!kind || p.kind === kind)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const units = new Map(ws.units.map((u) => [u.id, u]));
  return (
    <Page
      title="Exams, coursework & assignments"
      subtitle="Set papers from the curriculum: choose topics and the format (standard MCQ / short answer / long essay, or your own), or copy the format of a reference exam. Every paper comes with a marking scheme."
      actions={
        <LinkButton to="/assessments/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
          New assessment
        </LinkButton>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Select aria-label="Course unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">All course units</option>
          {sortUnits(ws.units).map((u) => (
            <option key={u.id} value={u.id}>
              {unitLabel(u)}
            </option>
          ))}
        </Select>
        <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as PaperKind | '')}>
          <option value="">All types</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      {papers.length === 0 ? (
        <Empty icon={<ClipboardList className="h-8 w-8" />} title="No assessments yet" action={<LinkButton to="/assessments/new" variant="primary">Set an exam or assignment</LinkButton>}>
          AI writes the questions from your curriculum and references; you review and edit every question before using it.
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-panel2 text-left text-xs text-muted">
              <tr>
                <th className="p-2.5">Title</th>
                <th className="p-2.5">Course unit</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Questions</th>
                <th className="p-2.5">Marks</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((p) => {
                const u = units.get(p.unitId);
                return (
                  <tr key={p.id} className="border-t border-line hover:bg-panel2/60">
                    <td className="p-2.5">
                      <A to={`/assessments/${p.id}`}>{p.title}</A>
                    </td>
                    <td className="p-2.5">{u ? <A to={`/units/${u.id}`} query={{ tab: 'assessments' }}>{u.code || u.title}</A> : '—'}</td>
                    <td className="p-2.5 text-muted">{KIND_LABEL[p.kind]}</td>
                    <td className="p-2.5">{questionCount(p)}</td>
                    <td className="p-2.5">{paperMarks(p)}</td>
                    <td className="p-2.5">
                      <Badge tone={p.status === 'final' ? 'good' : 'warn'}>{p.status}</Badge>
                    </td>
                    <td className="p-2.5 text-muted">{formatDate(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ Builder --

const KIND_DEFAULT_FORMAT: Record<PaperKind, string> = {
  exam: 'fmt-standard',
  coursework: 'fmt-cat',
  test: 'fmt-cat',
  quiz: 'fmt-cat',
  assignment: 'fmt-assignment',
  practical: 'fmt-cat',
};

function Builder() {
  const ws = useWorkspace();
  const route = useRoute();
  const { toast } = useUi();
  const { busy, run } = useAction();
  const units = sortUnits(ws.units);
  const [unitId, setUnitId] = useState(route.query.get('unit') ?? units[0]?.id ?? '');
  const unit = ws.units.find((u) => u.id === unitId);
  const [kind, setKind] = useState<PaperKind>('exam');
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [formatId, setFormatId] = useState(KIND_DEFAULT_FORMAT.exam);
  const [sections, setSections] = useState<FormatSection[]>([]);
  const [duration, setDuration] = useState('3 hours');
  const [instructions, setInstructions] = useState('');
  const [extra, setExtra] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'moderate' | 'hard' | 'mixed'>('mixed');
  const [source, setSource] = useState<'ai' | 'bank' | 'blank'>('ai');
  const [saveToBank, setSaveToBank] = useState(true);
  const refs = unit ? unitReferences(ws, unit) : [];
  const [refIds, setRefIds] = useState<string[]>([]);
  const format = ws.formats.find((f) => f.id === formatId);

  useEffect(() => {
    if (!unit) return;
    const t = route.query.get('topic');
    setTopicIds(t && unit.topics.some((x) => x.id === t) ? [t] : unit.topics.map((x) => x.id));
    setRefIds(unitReferences(ws, unit).map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  useEffect(() => {
    if (!format) return;
    setSections(format.sections.map((s) => ({ ...s })));
    setDuration(format.duration);
    setInstructions(format.instructions);
  }, [formatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Analysing a reference exam's format (from ?formatFrom=<library id> or an upload).
  const analyseFormat = (text: string, name: string) =>
    run('format', async () => {
      const res = await api.examFormat(text, aiProvider());
      const f: ExamFormat = {
        id: uid('fmt-'),
        name: res.name && res.name !== 'Reference exam format' ? res.name : `Format of ${name}`,
        duration: res.duration,
        instructions: res.instructions,
        styleNotes: res.style_notes,
        sections: res.sections.map((s) => ({ title: s.title, type: s.type as QuestionType, count: s.count, marksEach: s.marks_each, choose: s.choose, instructions: s.instructions })),
        createdAt: now(),
      };
      upsert('formats', f);
      setFormatId(f.id);
      toast(`Format saved: ${f.sections.length} sections, ${formatTotal(f)} marks`);
    });
  useEffect(() => {
    const rid = route.query.get('formatFrom');
    const r = rid && ws.references.find((x) => x.id === rid);
    if (r) void analyseFormat(r.text, r.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = formatTotal({ sections });
  const ranges = unit ? hourRanges(unit.topics) : {};
  const chosenTopics = unit?.topics.filter((t) => topicIds.includes(t.id)) ?? [];

  const create = () =>
    run('create', async () => {
      if (!unit) throw new Error('Choose a course unit.');
      if (!chosenTopics.length) throw new Error('Choose at least one topic.');
      if (!sections.length) throw new Error('Add at least one section to the format.');
      const title = `${unit.code ? unit.code + ' ' : ''}${unit.title} — ${KIND_LABEL[kind]}`;
      let paperSections: PaperSection[];
      let model = '';
      let paperInstructions = instructions;
      if (source === 'ai') {
        const provider = aiProvider();
        const refsUsed = ws.references.filter((r) => refIds.includes(r.id));
        const res = await api.assessment(
          {
            kind,
            programme: programmeTitle(ws, unit),
            unit: unitCtx(unit),
            topics: chosenTopics.map(topicCtx),
            sections: sections.map((s) => ({ title: s.title, type: s.type, count: s.count, marks_each: s.marksEach, choose: s.choose, instructions: s.instructions })),
            duration,
            difficulty,
            style_notes: format?.styleNotes ?? '',
            instructions: extra,
            sources: sourcesFor(refsUsed, chosenTopics.map((t) => `${t.title} ${t.subtopics.join(' ')}`).join(' '), 36_000),
          },
          provider,
        );
        paperSections = fromServerSections(res.sections);
        model = res.model;
        paperInstructions = instructions || res.instructions;
      } else {
        paperSections = sections.map((s) => {
          const picked = source === 'bank' ? pickFromBank(ws.bank, unit.id, s.type, s.count, chosenTopics.map((t) => t.title)) : [];
          const qs = [...picked, ...Array.from({ length: Math.max(0, s.count - picked.length) }, () => blankQuestion(s.type))].map((q) => ({ ...q, marks: s.marksEach || q.marks }));
          return { id: uid('s-'), title: s.title, type: s.type, instructions: s.instructions, choose: s.choose, questions: qs };
        });
      }
      const t = now();
      const paper: Paper = {
        id: uid('pp-'),
        unitId: unit.id,
        kind,
        title,
        instructions: paperInstructions,
        duration,
        academicYear: ws.settings.academicYear,
        sections: paperSections,
        topicIds: chosenTopics.map((x) => x.id),
        formatId,
        status: 'draft',
        model,
        createdAt: t,
        updatedAt: t,
      };
      update((w) => {
        const bankAdds =
          source === 'ai' && saveToBank
            ? paperSections.flatMap((s) => s.questions.map((q) => toBank(q, unit.id, 'paper', unit.topics.find((tp) => tp.title.toLowerCase() === q.topic.toLowerCase())?.id)))
            : [];
        return { ...w, papers: [...w.papers, paper], bank: [...w.bank, ...bankAdds] };
      });
      toast(source === 'ai' ? `Paper written: ${plural(questionCount(paper), 'question')}, ${paperMarks(paper)} marks. Review it before use.` : 'Paper created');
      navigate(`/assessments/${paper.id}`);
    });

  if (!units.length)
    return (
      <Page title="New assessment" back={{ to: '/assessments', label: 'Assessments' }}>
        <Empty title="Add a course unit first" action={<LinkButton to="/curriculum" variant="primary">Import a curriculum</LinkButton>}>
          Assessments are set per course unit, from its topics.
        </Empty>
      </Page>
    );

  return (
    <Page back={{ to: '/assessments', label: 'Assessments' }} title="New exam, coursework or assignment">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="1. What and for which unit">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Course unit">
                <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {unitLabel(u)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Type">
                <Select
                  value={kind}
                  onChange={(e) => {
                    const k = e.target.value as PaperKind;
                    setKind(k);
                    setFormatId(KIND_DEFAULT_FORMAT[k]);
                  }}
                >
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card
            title={`2. Topics to examine (${chosenTopics.length} of ${unit?.topics.length ?? 0})`}
            actions={
              unit && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setTopicIds(unit.topics.map((t) => t.id))}>
                    All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setTopicIds([])}>
                    None
                  </Button>
                </>
              )
            }
          >
            {!unit?.topics.length ? (
              <p className="text-sm text-muted">
                This unit has no topics yet. <A to={`/units/${unitId}`}>Add the outline</A> first.
              </p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {unit.topics.map((t) => (
                  <Checkbox
                    key={t.id}
                    checked={topicIds.includes(t.id)}
                    onChange={(v) => setTopicIds(v ? [...topicIds, t.id] : topicIds.filter((x) => x !== t.id))}
                    label={
                      <span className="text-sm">
                        {t.title} <span className="text-xs text-muted">({t.hours} h, hours {ranges[t.id]?.start}–{ranges[t.id]?.end})</span>
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title={`3. Format — ${plural(sections.reduce((s, x) => s + x.count, 0), 'question')}, ${total} marks`}>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <Field label="Start from" hint="Standard and CAT formats are built in. Analysed reference exams appear here too.">
                <Select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
                  {ws.formats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.builtIn ? '' : '★ '}
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div>
                <div className="mb-1 text-xs font-medium text-muted">Copy the format of a reference exam</div>
                <div className="flex flex-wrap gap-2">
                  <FileButton
                    accept={ACCEPT}
                    icon={<Upload className="h-4 w-4" />}
                    disabled={!!busy}
                    onFiles={(files) =>
                      void run('format-upload', async () => {
                        const r = await addReference(files[0], { category: 'past_paper', unitIds: unitId ? [unitId] : [] });
                        await analyseFormat(r.text, r.name);
                      })
                    }
                  >
                    Upload paper
                  </FileButton>
                  <Select
                    aria-label="Past paper from library"
                    value=""
                    onChange={(e) => {
                      const r = ws.references.find((x) => x.id === e.target.value);
                      if (r) void analyseFormat(r.text, r.name);
                    }}
                    className="w-auto min-w-0 flex-1"
                  >
                    <option value="">From library…</option>
                    {ws.references
                      .filter((r) => r.category === 'past_paper')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </Select>
                </div>
                {(busy === 'format' || busy === 'format-upload') && <div className="mt-1 text-xs text-muted">Analysing the paper’s sections, marks and style…</div>}
              </div>
            </div>
            {format?.styleNotes && <p className="mb-3 rounded-lg bg-accent/10 p-2 text-xs">Style to follow: {format.styleNotes}</p>}
            <SectionsEditor sections={sections} onChange={setSections} />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Time allowed">
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
              </Field>
              <Field label="Difficulty">
                <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
                  <option value="mixed">Mixed (recommended)</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </Select>
              </Field>
              <Field label="Instructions to candidates" className="sm:col-span-3">
                <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="4. Questions come from">
            <div className="space-y-2 text-sm">
              {(
                [
                  ['ai', 'AI writes new questions with a marking scheme'],
                  ['bank', `Question bank (${ws.bank.filter((b) => b.unitId === unitId).length} for this unit), blanks for the rest`],
                  ['blank', 'Blank paper — I will write the questions'],
                ] as const
              ).map(([v, label]) => (
                <label key={v} className="flex items-start gap-2">
                  <input type="radio" name="source" checked={source === v} onChange={() => setSource(v)} className="mt-1" />
                  {label}
                </label>
              ))}
            </div>
            {source === 'ai' && (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 text-xs font-medium text-muted">Ground questions in these references</div>
                  {refs.length === 0 ? (
                    <p className="text-xs text-muted">
                      None linked to this unit. <A to={`/units/${unitId}`} query={{ tab: 'references' }}>Add references</A>
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {refs.map((r) => (
                        <Checkbox key={r.id} checked={refIds.includes(r.id)} onChange={(v) => setRefIds(v ? [...refIds, r.id] : refIds.filter((x) => x !== r.id))} label={<span className="text-xs">{r.name}</span>} />
                      ))}
                    </div>
                  )}
                </div>
                <Field label="Extra instructions for the examiner (optional)">
                  <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. Include two calculation questions on dosage; use local drug names" />
                </Field>
                <Checkbox checked={saveToBank} onChange={setSaveToBank} label={<span className="text-xs">Also add the questions to the question bank</span>} />
              </div>
            )}
            <Button className="mt-4 w-full" variant="primary" icon={source === 'ai' ? <Wand2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} busy={busy === 'create'} disabled={!unit || !chosenTopics.length || !sections.length} onClick={() => void create()}>
              {source === 'ai' ? 'Write the paper' : 'Create paper'}
            </Button>
            {busy === 'create' && <p className="mt-2 text-xs text-muted">Writing questions and marking schemes. A full paper takes about a minute…</p>}
          </Card>
        </div>
      </div>
    </Page>
  );
}

function SectionsEditor({ sections, onChange }: { sections: FormatSection[]; onChange: (s: FormatSection[]) => void }) {
  const set = (i: number, c: Partial<FormatSection>) => onChange(sections.map((s, j) => (j === i ? { ...s, ...c } : s)));
  const num = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1">Section</th>
              <th className="p-1">Question type</th>
              <th className="p-1">Questions</th>
              <th className="p-1">Marks each</th>
              <th className="p-1" title="Candidates answer any N (0 = all)">
                Answer any
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <tr key={i} className="border-t border-line">
                <td className="p-1">
                  <Input aria-label="Section title" value={s.title} onChange={(e) => set(i, { title: e.target.value })} />
                </td>
                <td className="w-44 p-1">
                  <Select aria-label="Question type" value={s.type} onChange={(e) => set(i, { type: e.target.value as QuestionType })}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="w-20 p-1">
                  <Input aria-label="Number of questions" type="number" min={1} value={s.count} onChange={(e) => set(i, { count: Math.max(1, num(e.target.value)) })} />
                </td>
                <td className="w-20 p-1">
                  <Input aria-label="Marks each" type="number" min={0} value={s.marksEach} onChange={(e) => set(i, { marksEach: num(e.target.value) })} />
                </td>
                <td className="w-20 p-1">
                  <Input aria-label="Answer any" type="number" min={0} value={s.choose} onChange={(e) => set(i, { choose: Math.min(s.count, num(e.target.value)) })} />
                </td>
                <td className="p-1">
                  <Button size="sm" variant="ghost" aria-label="Remove section" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(sections.filter((_, j) => j !== i))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        size="sm"
        className="mt-2"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => onChange([...sections, { title: `Section ${String.fromCharCode(65 + sections.length)}`, type: 'short', count: 5, marksEach: 4, choose: 0, instructions: '' }])}
      >
        Add section
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------- Editor --

function PaperEditor({ id }: { id: string }) {
  const ws = useWorkspace();
  const { toast, confirm } = useUi();
  const { busy, run } = useAction();
  const [bankFor, setBankFor] = useState<string | null>(null);
  const paper = ws.papers.find((p) => p.id === id);
  const unit = ws.units.find((u) => u.id === paper?.unitId);
  const numbering = useMemo(() => (paper ? new Map(numbered(paper).map((x) => [x.question.id, x.number])) : new Map()), [paper]);
  if (!paper)
    return (
      <Page title="Assessment not found" back={{ to: '/assessments', label: 'Assessments' }}>
        <Empty title="This paper was deleted or has not synced to this device yet." />
      </Page>
    );
  const set = (c: Partial<Paper>) => patch('papers', paper.id, c);
  const setSection = (sid: string, c: Partial<PaperSection>) => set({ sections: paper.sections.map((s) => (s.id === sid ? { ...s, ...c } : s)) });
  const setQuestion = (sid: string, q: Question) => setSection(sid, { questions: paper.sections.find((s) => s.id === sid)!.questions.map((x) => (x.id === q.id ? q : x)) });
  const moveQ = (sid: string, i: number, d: number) => {
    const qs = [...paper.sections.find((s) => s.id === sid)!.questions];
    const [q] = qs.splice(i, 1);
    qs.splice(i + d, 0, q);
    setSection(sid, { questions: qs });
  };
  const ctx = { unit, programme: programmeTitle(ws, unit), institution: ws.settings.institution };

  const doExport = (mode: 'paper' | 'scheme', format: 'docx' | 'pdf') =>
    run(`${mode}-${format}`, async () => {
      const md = paperToMarkdown(paper, ctx, mode);
      const title = mode === 'paper' ? paper.title : `${paper.title} — Marking scheme`;
      const res = await exportDocument(format, md, docMeta(ws, title, `${KIND_LABEL[paper.kind]} · ${paper.academicYear}`, paper.status, !!paper.model));
      if (res.saved) toast(`Saved ${res.name} to ${res.method}`);
    });

  const regenerate = (sid: string, q: Question) =>
    run(`regen-${q.id}`, async () => {
      if (!unit) throw new Error('This paper has no course unit.');
      const topic = unit.topics.find((t) => t.title.toLowerCase() === q.topic.toLowerCase()) ?? unit.topics.find((t) => paper.topicIds.includes(t.id)) ?? unit.topics[0];
      if (!topic) throw new Error('The unit has no topics.');
      const res = await api.questions(
        { unit: unitCtx(unit), topic: topicCtx(topic), count: 1, types: [q.type], difficulty: 'mixed', sources: sourcesFor(unitReferences(ws, unit), topic.title, 16_000) },
        aiProvider(),
      );
      const fresh = fromServerQuestion(res.questions[0]);
      setQuestion(sid, { ...fresh, id: q.id, marks: q.marks });
      toast('Question replaced');
    });

  const duplicate = () => {
    const t = now();
    const copy: Paper = { ...structuredClone(paper), id: uid('pp-'), title: `${paper.title} (copy)`, status: 'draft', createdAt: t, updatedAt: t };
    upsert('papers', copy);
    navigate(`/assessments/${copy.id}`);
  };

  const allToBank = () => {
    if (!unit) return;
    const existing = new Set(ws.bank.filter((b) => b.unitId === unit.id).map((b) => b.prompt.trim()));
    const adds = paper.sections.flatMap((s) => s.questions).filter((q) => q.prompt.trim() && !existing.has(q.prompt.trim()));
    update((w) => ({ ...w, bank: [...w.bank, ...adds.map((q) => toBank(q, unit.id, 'paper', unit.topics.find((t) => t.title.toLowerCase() === q.topic.toLowerCase())?.id))] }));
    toast(adds.length ? `${plural(adds.length, 'question')} added to the bank` : 'All questions are already in the bank', adds.length ? 'good' : 'info');
  };

  return (
    <Page
      back={{ to: unit ? `/units/${unit.id}?tab=assessments` : '/assessments', label: unit ? unitLabel(unit) : 'Assessments' }}
      title={<EditableText value={paper.title} onCommit={(v) => v.trim() && set({ title: v.trim() })} ariaLabel="Paper title" className="!border-transparent !bg-transparent !px-0 text-xl font-bold sm:text-2xl" />}
      subtitle={
        <span className="flex flex-wrap gap-x-3">
          <span>{KIND_LABEL[paper.kind]}</span>
          <span>{plural(questionCount(paper), 'question')}</span>
          <span className="font-semibold text-ink">{paperMarks(paper)} marks</span>
          {paper.model && <span>AI: {paper.model}</span>}
          {unit && (
            <A to="/students" query={{ unit: unit.id }}>
              Record marks
            </A>
          )}
        </span>
      }
      actions={
        <>
          <Button variant={paper.status === 'final' ? 'secondary' : 'primary'} onClick={() => set({ status: paper.status === 'final' ? 'draft' : 'final' })}>
            {paper.status === 'final' ? 'Mark as draft' : 'Approve as final'}
          </Button>
          <Button icon={<Copy className="h-4 w-4" />} onClick={duplicate}>
            Duplicate
          </Button>
          <Button
            variant="danger"
            aria-label="Delete paper"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              if (await confirm('Delete this paper?', { danger: true, ok: 'Delete', detail: 'Questions already saved in the question bank are kept.' })) {
                remove('papers', paper.id);
                navigate('/assessments');
              }
            }}
          />
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <Card title="Paper details">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Type">
                <Select value={paper.kind} onChange={(e) => set({ kind: e.target.value as PaperKind })}>
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Time allowed">
                <EditableText value={paper.duration} onCommit={(v) => set({ duration: v })} />
              </Field>
              <Field label="Academic year">
                <EditableText value={paper.academicYear} onCommit={(v) => set({ academicYear: v })} />
              </Field>
              <Field label="Instructions to candidates" className="sm:col-span-3">
                <EditableText multiline value={paper.instructions} onCommit={(v) => set({ instructions: v })} />
              </Field>
            </div>
          </Card>

          {paper.sections.map((s, si) => (
            <Card
              key={s.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <EditableText value={s.title} ariaLabel="Section title" onCommit={(v) => setSection(s.id, { title: v })} />
                  <span className="whitespace-nowrap text-xs font-normal text-muted">
                    {sectionMarks(s)} marks{s.choose ? ` · answer any ${s.choose} of ${s.questions.length}` : ''}
                  </span>
                </span>
              }
              actions={
                <>
                  <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setSection(s.id, { questions: [...s.questions, { ...blankQuestion(s.type), marks: s.questions[0]?.marks ?? 1 }] })}>
                    Question
                  </Button>
                  <Button size="sm" icon={<ListChecks className="h-3.5 w-3.5" />} onClick={() => setBankFor(s.id)}>
                    From bank
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Move section up" disabled={si === 0} icon={<ArrowUp className="h-3.5 w-3.5" />} onClick={() => { const a = [...paper.sections]; [a[si - 1], a[si]] = [a[si], a[si - 1]]; set({ sections: a }); }} />
                  <Button size="sm" variant="ghost" aria-label="Delete section" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={async () => (await confirm(`Delete ${s.title}?`, { danger: true, ok: 'Delete' })) && set({ sections: paper.sections.filter((x) => x.id !== s.id) })} />
                </>
              }
            >
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_140px]">
                <EditableText value={s.instructions} placeholder="Section instructions" ariaLabel="Section instructions" onCommit={(v) => setSection(s.id, { instructions: v })} />
                <div className="flex items-center gap-2 text-xs text-muted">
                  Answer any
                  <EditableText type="number" ariaLabel="Answer any" value={String(s.choose)} onCommit={(v) => setSection(s.id, { choose: Math.max(0, Number(v) || 0) })} />
                </div>
              </div>
              <div className="space-y-2">
                {s.questions.map((q, i) => (
                  <QuestionEditor
                    key={q.id}
                    q={q}
                    number={numbering.get(q.id)}
                    onChange={(nq) => setQuestion(s.id, nq)}
                    actions={
                      <>
                        <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} icon={<ArrowUp className="h-3.5 w-3.5" />} onClick={() => moveQ(s.id, i, -1)} />
                        <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === s.questions.length - 1} icon={<ArrowDown className="h-3.5 w-3.5" />} onClick={() => moveQ(s.id, i, 1)} />
                        <Button size="sm" variant="ghost" aria-label="Replace with a new AI question" title="Replace with a new AI question" busy={busy === `regen-${q.id}`} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void regenerate(s.id, q)} />
                        <Button size="sm" variant="ghost" aria-label="Delete question" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setSection(s.id, { questions: s.questions.filter((x) => x.id !== q.id) })} />
                      </>
                    }
                  />
                ))}
              </div>
            </Card>
          ))}
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => set({ sections: [...paper.sections, { id: uid('s-'), title: `Section ${String.fromCharCode(65 + paper.sections.length)}`, type: 'short', instructions: '', choose: 0, questions: [] }] })}>
            Add section
          </Button>
        </div>

        <aside className="space-y-4">
          <Card title="Export">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted">Question paper</div>
              <div className="flex gap-2">
                <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} busy={busy === 'paper-docx'} onClick={() => void doExport('paper', 'docx')}>
                  Word
                </Button>
                <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} busy={busy === 'paper-pdf'} onClick={() => void doExport('paper', 'pdf')}>
                  PDF
                </Button>
              </div>
              <div className="pt-2 text-xs font-medium text-muted">Marking scheme with model answers</div>
              <div className="flex gap-2">
                <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} busy={busy === 'scheme-docx'} onClick={() => void doExport('scheme', 'docx')}>
                  Word
                </Button>
                <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} busy={busy === 'scheme-pdf'} onClick={() => void doExport('scheme', 'pdf')}>
                  PDF
                </Button>
              </div>
            </div>
          </Card>
          <Card title="Use it">
            <div className="space-y-2">
              <Button className="w-full" icon={<BookmarkPlus className="h-4 w-4" />} onClick={allToBank}>
                Save all to question bank
              </Button>
              {unit && (
                <>
                  <LinkButton className="w-full" to="/students" query={{ unit: unit.id }}>
                    Record students’ marks
                  </LinkButton>
                  <LinkButton className="w-full" to="/solve" query={{ unit: unit.id, mode: 'mark' }} icon={<ScanText className="h-4 w-4" />}>
                    Mark a script with AI
                  </LinkButton>
                </>
              )}
            </div>
          </Card>
          {unit && paper.topicIds.length > 0 && (
            <Card title="Topics examined">
              <ul className="space-y-1 text-xs">
                {unit.topics
                  .filter((t) => paper.topicIds.includes(t.id))
                  .map((t) => {
                    const n = paper.sections.flatMap((s) => s.questions).filter((q) => q.topic.toLowerCase() === t.title.toLowerCase()).length;
                    return (
                      <li key={t.id} className="flex justify-between gap-2">
                        <span className="truncate">{t.title}</span>
                        <span className="text-muted">{n} q</span>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          )}
        </aside>
      </div>
      {bankFor && unit && (
        <BankPicker
          unitId={unit.id}
          type={paper.sections.find((s) => s.id === bankFor)?.type}
          onClose={() => setBankFor(null)}
          onPick={(qs) => {
            const s = paper.sections.find((x) => x.id === bankFor)!;
            setSection(s.id, { questions: [...s.questions, ...qs.map((q) => ({ ...q, id: uid('q-') }))] });
            setBankFor(null);
          }}
        />
      )}
    </Page>
  );
}

function BankPicker({ unitId, type, onClose, onPick }: { unitId: string; type?: QuestionType; onClose: () => void; onPick: (q: Question[]) => void }) {
  const ws = useWorkspace();
  const [onlyType, setOnlyType] = useState(true);
  const [chosen, setChosen] = useState<string[]>([]);
  const items = ws.bank.filter((b) => b.unitId === unitId && (!onlyType || !type || b.type === type));
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Add questions from the bank"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!chosen.length} onClick={() => onPick(items.filter((b) => chosen.includes(b.id)))}>
            Add {chosen.length || ''}
          </Button>
        </>
      }
    >
      {type && <Checkbox className="mb-3" checked={onlyType} onChange={setOnlyType} label={`Only ${TYPE_LABEL[type]} questions`} />}
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          No matching questions. <A to="/bank" query={{ unit: unitId }}>Open the question bank</A> to generate some.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b.id} className="rounded-lg border border-line p-2">
              <Checkbox checked={chosen.includes(b.id)} onChange={(v) => setChosen(v ? [...chosen, b.id] : chosen.filter((x) => x !== b.id))} label={<span className="text-sm">{b.prompt}</span>} />
              <div className="ml-6 text-[11px] text-muted">
                {TYPE_LABEL[b.type]} · {b.marks} marks · {b.topic}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
