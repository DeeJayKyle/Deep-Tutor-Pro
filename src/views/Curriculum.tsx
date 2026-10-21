import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, RefreshCw, Sparkles, Trash2, Upload, Wand2 } from 'lucide-react';
import type { Programme, Reference } from '../lib/model';
import { ACCEPT } from '../lib/extract';
import { api } from '../lib/api';
import { applyOutline, sortUnits, unitTotalHours, type Outline, type OutlineUnit } from '../lib/curriculum';
import { navigate, useRoute } from '../state/router';
import { patch, update, useWorkspace } from '../state/store';
import { aiProvider, plural } from '../state/helpers';
import { analyseUnits } from '../state/curriculumJobs';
import { cancelJob, useJobs } from '../state/jobs';
import { addReference } from '../state/library';
import { A, Badge, Button, Card, EditableText, Empty, Field, FileButton, Input, LinkButton, Page, Progress, Select, Textarea, useAction, useUi } from '../ui/kit';

export default function CurriculumView() {
  const route = useRoute();
  if (route.parts[0] === 'programmes' && route.parts[1]) return <ProgrammePage id={route.parts[1]} />;
  return <CurriculumHome />;
}

function CurriculumHome() {
  const ws = useWorkspace();
  const route = useRoute();
  const importing = route.query.get('import') === '1' || ws.programmes.length === 0;
  return (
    <Page
      title="Curriculum"
      subtitle="Import a full curriculum or teacher’s guide (e.g. Diploma or Certificate in Pharmacy). Deep Tutor Pro builds the classes, course units, outlines, learning objectives and contact hours from it."
      actions={!importing && <LinkButton to="/curriculum" query={{ import: '1' }} variant="primary" icon={<Upload className="h-4 w-4" />}>Import curriculum</LinkButton>}
    >
      {importing && <ImportWizard initialRef={route.query.get('ref') ?? undefined} />}
      {ws.programmes.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {ws.programmes.map((p) => (
            <ProgrammeCard key={p.id} programme={p} />
          ))}
        </div>
      )}
    </Page>
  );
}

function ProgrammeCard({ programme: p }: { programme: Programme }) {
  const ws = useWorkspace();
  const units = ws.units.filter((u) => u.programmeId === p.id);
  const analysed = units.filter((u) => u.analysed).length;
  const notes = ws.notes.filter((n) => units.some((u) => u.id === n.unitId)).length;
  return (
    <Card title={<A to={`/programmes/${p.id}`}>{p.title}</A>} actions={<Badge tone="accent">{p.awardLevel || 'Programme'}</Badge>}>
      <p className="mb-3 line-clamp-3 text-sm text-muted">{p.overview || p.institution || 'No overview.'}</p>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-panel2 p-2">
          <div className="text-lg font-bold">{units.length}</div>units
        </div>
        <div className="rounded-lg bg-panel2 p-2">
          <div className="text-lg font-bold">{p.durationYears}</div>years
        </div>
        <div className="rounded-lg bg-panel2 p-2">
          <div className="text-lg font-bold">{notes}</div>notes
        </div>
      </div>
      {analysed < units.length && <Progress value={units.length ? analysed / units.length : 0} label={`${analysed} of ${units.length} units analysed in detail`} />}
      <div className="mt-3">
        <LinkButton size="sm" to={`/programmes/${p.id}`}>
          Open programme
        </LinkButton>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ Import wizard --

type Step = 'source' | 'analysing' | 'review';

function ImportWizard({ initialRef }: { initialRef?: string }) {
  const ws = useWorkspace();
  const { toast } = useUi();
  const { busy, run } = useAction();
  const [step, setStep] = useState<Step>('source');
  const [refId, setRefId] = useState(initialRef ?? '');
  const [hint, setHint] = useState('');
  const [intake, setIntake] = useState(String(new Date().getFullYear()));
  const [reading, setReading] = useState<{ name: string; message: string; fraction: number } | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [autoDetail, setAutoDetail] = useState(true);
  const curricula = ws.references.filter((r) => r.category === 'curriculum');
  const ref = ws.references.find((r) => r.id === refId);

  useEffect(() => {
    if (initialRef) setRefId(initialRef);
  }, [initialRef]);

  const onFiles = async (files: File[]) => {
    // Several files (e.g. a curriculum split into parts) are combined into one document.
    const parts: Reference[] = [];
    for (const f of files) {
      setReading({ name: f.name, message: 'Opening…', fraction: 0 });
      try {
        parts.push(await addReference(f, { category: 'curriculum', onProgress: (message, fraction) => setReading({ name: f.name, message, fraction: fraction ?? 0 }) }));
      } catch (err) {
        toast((err as Error).message, 'bad');
      }
    }
    setReading(null);
    if (parts.length === 1) setRefId(parts[0].id);
    else if (parts.length > 1) {
      const combined: Reference = { ...parts[0], id: `${parts[0].id}-all`, name: `${parts[0].name} (+${parts.length - 1} more)`, text: parts.map((p) => p.text).join('\n\n'), size: parts.reduce((s, p) => s + p.size, 0) };
      update((w) => ({ ...w, references: [...w.references.filter((r) => !parts.some((p) => p.id === r.id)), combined] }));
      setRefId(combined.id);
    }
  };

  const analyse = () =>
    run('analyse', async () => {
      if (!ref) throw new Error('Choose or upload the curriculum first.');
      const provider = aiProvider();
      setStep('analysing');
      try {
        const res = await api.outline(ref.text, hint, provider);
        setOutline(res);
        setTruncated(res.truncated);
        setStep('review');
      } catch (err) {
        setStep('source');
        throw err;
      }
    });

  const apply = () =>
    run('apply', async () => {
      if (!outline || !ref) return;
      const kept = { ...outline, units: outline.units.filter((u) => u.title.trim()) };
      let created: ReturnType<typeof applyOutline> | null = null;
      update((w) => {
        created = applyOutline(w, kept, { referenceId: ref.id, intake });
        return created.ws;
      });
      const res = created as unknown as ReturnType<typeof applyOutline>;
      toast(`Created ${res.programme.title}: ${plural(res.unitIds.length, 'course unit')} and a class for each year`);
      navigate(`/programmes/${res.programme.id}`);
      if (autoDetail) void analyseUnits(res.programme.id);
    });

  if (step === 'analysing')
    return (
      <Card title="Analysing the curriculum">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="h-5 w-5 animate-spin text-accent" />
          Reading {ref?.name} and finding the programme, years, semesters, course units and contact hours. Large documents take a minute or two…
        </div>
      </Card>
    );

  if (step === 'review' && outline)
    return (
      <OutlineReview
        outline={outline}
        setOutline={setOutline}
        truncated={truncated}
        autoDetail={autoDetail}
        setAutoDetail={setAutoDetail}
        busy={busy === 'apply'}
        onBack={() => setStep('source')}
        onApply={() => void apply()}
      />
    );

  return (
    <Card title="Import a curriculum or teacher’s guide">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm text-muted">1. Upload the document. PDFs (including scanned copies), Word, PowerPoint and photos of pages all work; text is read on this device.</p>
          <FileButton multiple accept={ACCEPT} variant="primary" icon={<Upload className="h-4 w-4" />} onFiles={(f) => void onFiles(f)} disabled={!!reading}>
            Upload curriculum
          </FileButton>
          {reading && <Progress value={reading.fraction} label={`${reading.name}: ${reading.message}`} />}
          {curricula.length > 0 && (
            <Field label="…or choose one already in the library">
              <Select value={refId} onChange={(e) => setRefId(e.target.value)}>
                <option value="">Choose…</option>
                {curricula.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {ref && (
            <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm">
              <strong>{ref.name}</strong> — {ref.text.length.toLocaleString()} characters
              {ref.pages ? `, ${ref.pages} pages` : ''}
              {ref.ocrPages ? ` (${ref.ocrPages} read by OCR)` : ''}. <A to={`/library/${ref.id}`}>Check the text</A>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted">2. Optional details, then analyse.</p>
          <Field label="Programme name (if the document does not say)">
            <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. Diploma in Pharmacy" />
          </Field>
          <Field label="Intake / cohort year for the new classes">
            <Input value={intake} onChange={(e) => setIntake(e.target.value)} />
          </Field>
          <Button variant="primary" icon={<Wand2 className="h-4 w-4" />} busy={busy === 'analyse'} disabled={!ref} onClick={() => void analyse()}>
            Analyse with AI
          </Button>
          <p className="text-xs text-muted">
            You review the result before anything is created. No AI? <A to="/units" query={{ add: '1' }}>Add units by hand</A>.
          </p>
        </div>
      </div>
    </Card>
  );
}

function OutlineReview({
  outline,
  setOutline,
  truncated,
  autoDetail,
  setAutoDetail,
  busy,
  onBack,
  onApply,
}: {
  outline: Outline;
  setOutline: (o: Outline) => void;
  truncated: boolean;
  autoDetail: boolean;
  setAutoDetail: (v: boolean) => void;
  busy: boolean;
  onBack: () => void;
  onApply: () => void;
}) {
  const p = outline.programme;
  const setP = (changes: Partial<Outline['programme']>) => setOutline({ ...outline, programme: { ...p, ...changes } });
  const setU = (i: number, changes: Partial<OutlineUnit>) => setOutline({ ...outline, units: outline.units.map((u, j) => (j === i ? { ...u, ...changes } : u)) });
  const years = useMemo(() => [...new Set(outline.units.map((u) => u.year))].sort((a, b) => a - b), [outline.units]);
  const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return (
    <Card
      title="Review the analysis"
      actions={
        <>
          <Button onClick={onBack}>Back</Button>
          <Button variant="primary" busy={busy} icon={<Sparkles className="h-4 w-4" />} onClick={onApply}>
            Create programme, classes & units
          </Button>
        </>
      }
    >
      {truncated && <p className="mb-3 rounded-lg bg-warn/10 p-2 text-xs text-warn">The document is very long; only its first part was analysed for the unit list. Add any missing units below.</p>}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Field label="Programme">
          <Input value={p.title} onChange={(e) => setP({ title: e.target.value })} />
        </Field>
        <Field label="Institution / awarding body">
          <Input value={p.institution} onChange={(e) => setP({ institution: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Award">
            <Input value={p.award_level} onChange={(e) => setP({ award_level: e.target.value })} />
          </Field>
          <Field label="Years">
            <Input type="number" min={1} value={p.duration_years} onChange={(e) => setP({ duration_years: Math.max(1, num(e.target.value)) })} />
          </Field>
        </div>
        <Field label="Overview" className="md:col-span-3">
          <Textarea rows={2} value={p.overview} onChange={(e) => setP({ overview: e.target.value })} />
        </Field>
      </div>
      <div className="mb-2 text-sm font-medium">
        {plural(outline.units.length, 'course unit')} in {plural(years.length, 'year')} — edit anything that is wrong:
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1">Code</th>
              <th className="p-1">Course unit</th>
              <th className="p-1">Year</th>
              <th className="p-1">Sem.</th>
              <th className="p-1">Credits</th>
              <th className="p-1">Contact hours</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {outline.units.map((u, i) => (
              <tr key={i} className="border-t border-line">
                <td className="w-28 p-1">
                  <Input aria-label="Code" value={u.code} onChange={(e) => setU(i, { code: e.target.value })} />
                </td>
                <td className="p-1">
                  <Input aria-label="Title" value={u.title} onChange={(e) => setU(i, { title: e.target.value })} />
                </td>
                <td className="w-20 p-1">
                  <Input aria-label="Year" type="number" min={1} value={u.year} onChange={(e) => setU(i, { year: Math.max(1, num(e.target.value)) })} />
                </td>
                <td className="w-20 p-1">
                  <Input aria-label="Semester" type="number" min={0} value={u.semester} onChange={(e) => setU(i, { semester: num(e.target.value) })} />
                </td>
                <td className="w-20 p-1">
                  <Input aria-label="Credits" type="number" min={0} value={u.credit_units} onChange={(e) => setU(i, { credit_units: num(e.target.value) })} />
                </td>
                <td className="w-24 p-1">
                  <Input aria-label="Hours" type="number" min={0} value={u.total_hours} onChange={(e) => setU(i, { total_hours: num(e.target.value) })} />
                </td>
                <td className="p-1">
                  <Button size="sm" variant="ghost" aria-label="Remove unit" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setOutline({ ...outline, units: outline.units.filter((_, j) => j !== i) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() =>
            setOutline({ ...outline, units: [...outline.units, { code: '', title: '', year: years[years.length - 1] ?? 1, semester: 1, credit_units: 0, lecture_hours: 0, tutorial_hours: 0, practical_hours: 0, clinical_hours: 0, total_hours: 0, start_marker: '' }] })
          }
        >
          Add unit
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoDetail} onChange={(e) => setAutoDetail(e.target.checked)} className="h-4 w-4" />
          Then extract every unit’s topics, contact hours and learning objectives (runs in the background)
        </label>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ Programme page --

function ProgrammePage({ id }: { id: string }) {
  const ws = useWorkspace();
  const jobs = useJobs();
  const { confirm, toast } = useUi();
  const { run } = useAction();
  const p = ws.programmes.find((x) => x.id === id);
  if (!p)
    return (
      <Page title="Programme not found" back={{ to: '/curriculum', label: 'Curriculum' }}>
        <Empty title="This programme was deleted or has not synced to this device yet." />
      </Page>
    );
  const units = sortUnits(ws.units.filter((u) => u.programmeId === p.id));
  const classes = ws.classes.filter((c) => c.programmeId === p.id).sort((a, b) => a.year - b.year);
  const job = jobs.find((j) => j.id === `analyse-${p.id}`);
  const pending = units.filter((u) => !u.analysed);
  const years = [...new Set(units.map((u) => u.year))].sort((a, b) => a - b);
  const source = ws.references.find((r) => r.id === p.sourceReferenceId);
  const set = (changes: Partial<Programme>) => patch('programmes', p.id, changes);

  const del = async () => {
    if (!(await confirm(`Delete ${p.title}?`, { danger: true, ok: 'Delete everything', detail: `This deletes the programme, its ${units.length} course units with their lecture notes, exams and question bank, and its classes. Students are kept (without a class). This cannot be undone except from a backup or cloud history.` })))
      return;
    const unitIds = new Set(units.map((u) => u.id));
    const classIds = new Set(classes.map((c) => c.id));
    update((w) => ({
      ...w,
      programmes: w.programmes.filter((x) => x.id !== p.id),
      units: w.units.filter((u) => !unitIds.has(u.id)),
      notes: w.notes.filter((n) => !unitIds.has(n.unitId)),
      papers: w.papers.filter((x) => !unitIds.has(x.unitId)),
      bank: w.bank.filter((q) => !unitIds.has(q.unitId)),
      classes: w.classes.filter((c) => !classIds.has(c.id)),
      students: w.students.map((s) => (classIds.has(s.classId) ? { ...s, classId: '' } : s)),
    }));
    toast('Programme deleted');
    navigate('/curriculum');
  };

  return (
    <Page
      back={{ to: '/curriculum', label: 'Curriculum' }}
      title={<EditableText value={p.title} onCommit={(v) => v.trim() && set({ title: v.trim() })} ariaLabel="Programme title" className="!bg-transparent !border-transparent !px-0 text-xl font-bold sm:text-2xl" />}
      subtitle={
        <>
          {p.awardLevel || 'Programme'} · {p.durationYears} years · {plural(units.length, 'course unit')} · {Math.round(units.reduce((s, u) => s + unitTotalHours(u), 0))} contact hours
          {source && (
            <>
              {' '}· Source: <A to={`/library/${source.id}`}>{source.name}</A>
            </>
          )}
        </>
      }
      actions={
        <>
          {pending.length > 0 && (!job || job.status !== 'running') && (
            <Button variant="primary" icon={<Wand2 className="h-4 w-4" />} onClick={() => void run('analyse', () => analyseUnits(p.id))}>
              Extract details for {plural(pending.length, 'unit')}
            </Button>
          )}
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => void del()}>
            Delete
          </Button>
        </>
      }
    >
      {job && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Progress value={job.total ? job.done / job.total : 1} label={`${job.label}: ${job.done} of ${job.total} — ${job.message}`} />
              {job.errors.length > 0 && <div className="mt-1 text-xs text-bad">{job.errors.slice(-3).join(' · ')}</div>}
            </div>
            {job.status === 'running' && (
              <Button size="sm" onClick={() => cancelJob(job.id)}>
                Stop
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="About this programme" className="lg:col-span-1">
          <div className="space-y-3">
            <Field label="Institution">
              <EditableText value={p.institution} onCommit={(v) => set({ institution: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Award level">
                <EditableText value={p.awardLevel} onCommit={(v) => set({ awardLevel: v })} />
              </Field>
              <Field label="Duration (years)">
                <EditableText type="number" value={String(p.durationYears)} onCommit={(v) => set({ durationYears: Math.max(1, Number(v) || 1) })} />
              </Field>
            </div>
            <Field label="Overview">
              <EditableText multiline value={p.overview} onCommit={(v) => set({ overview: v })} />
            </Field>
            <Field label="Entry requirements">
              <EditableText multiline value={p.entryRequirements} onCommit={(v) => set({ entryRequirements: v })} />
            </Field>
            <Field label="Assessment & grading policy">
              <EditableText multiline value={p.assessmentPolicy} onCommit={(v) => set({ assessmentPolicy: v })} />
            </Field>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card title="Classes (one per year of study)" actions={<LinkButton size="sm" to="/students">Students & marks</LinkButton>}>
            {classes.length === 0 ? (
              <p className="text-sm text-muted">No classes.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {classes.map((c) => (
                  <a key={c.id} href={`#/students/class/${c.id}`} className="rounded-lg border border-line p-3 hover:border-accent">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted">
                      Year {c.year} · {plural(ws.students.filter((s) => s.classId === c.id).length, 'student')} · {plural(units.filter((u) => u.year === c.year).length, 'unit')}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {years.map((y) => (
            <Card key={y} title={`Year ${y}`} padded={false}>
              <div className="divide-y divide-line">
                {units
                  .filter((u) => u.year === y)
                  .map((u) => {
                    const notes = ws.notes.filter((n) => n.unitId === u.id).length;
                    const papers = ws.papers.filter((x) => x.unitId === u.id).length;
                    return (
                      <a key={u.id} href={`#/units/${u.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-panel2">
                        <span className="w-24 shrink-0 font-mono text-xs text-muted">{u.code || '—'}</span>
                        <span className="min-w-0 flex-1 font-medium">{u.title}</span>
                        <span className="text-xs text-muted">Sem {u.semester || '—'}</span>
                        <span className="text-xs text-muted">{unitTotalHours(u)} h</span>
                        <span className="text-xs text-muted">{plural(u.topics.length, 'topic')}</span>
                        {notes > 0 && <Badge tone="good">{notes} notes</Badge>}
                        {papers > 0 && <Badge tone="accent">{papers} papers</Badge>}
                        {!u.analysed && <Badge tone="warn">outline pending</Badge>}
                      </a>
                    );
                  })}
              </div>
            </Card>
          ))}
          {units.length === 0 && (
            <Empty icon={<GraduationCap className="h-8 w-8" />} title="No course units">
              <A to="/units" query={{ add: '1', programme: p.id }}>
                Add a unit
              </A>
            </Empty>
          )}
        </div>
      </div>
    </Page>
  );
}

