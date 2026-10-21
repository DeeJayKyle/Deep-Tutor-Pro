import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, ClipboardList, FileText, ListChecks, Plus, Search, Trash2, Upload, Wand2 } from 'lucide-react';
import type { Topic, Unit } from '../lib/model';
import { ACCEPT } from '../lib/extract';
import { formatHours, hourRanges, sortUnits, unitTotalHours } from '../lib/curriculum';
import { now, uid, unitLabel } from '../lib/workspace';
import { KIND_LABEL, paperMarks } from '../lib/papers';
import { navigate, useRoute } from '../state/router';
import { patch, update, upsert, useWorkspace } from '../state/store';
import { analyseUnits, generateUnitNotes } from '../state/curriculumJobs';
import { cancelJob, useJobs } from '../state/jobs';
import { plural, unitReferences } from '../state/helpers';
import { CATEGORY_LABEL } from '../state/library';
import { useUploader } from './Library';
import { A, Badge, Button, Card, Checkbox, EditableText, Empty, Field, FileButton, Input, LinesEditor, LinkButton, Modal, Page, Progress, Select, Tabs, Textarea, useAction, useUi } from '../ui/kit';

export default function UnitsView() {
  const route = useRoute();
  useEffect(() => {
    if (route.parts[0] === 'classes' && route.parts[1]) navigate(`/students/class/${route.parts[1]}`, undefined, true);
  }, [route.parts]);
  if (route.parts[0] === 'units' && route.parts[1]) return <UnitPage id={route.parts[1]} />;
  return <UnitList />;
}

export function blankUnit(programmeId?: string, year = 1): Unit {
  const t = now();
  return {
    id: uid('u-'),
    programmeId,
    code: '',
    title: 'New course unit',
    year,
    semester: 1,
    creditUnits: 0,
    hours: { lecture: 0, tutorial: 0, practical: 0, clinical: 0, total: 0 },
    overview: '',
    aims: [],
    outcomes: [],
    topics: [],
    teachingMethods: [],
    assessment: '',
    references: [],
    hoursEstimated: false,
    referenceIds: [],
    analysed: true,
    createdAt: t,
    updatedAt: t,
  };
}

function UnitList() {
  const ws = useWorkspace();
  const route = useRoute();
  const [q, setQ] = useState('');
  const programme = route.query.get('programme') ?? '';
  const year = route.query.get('year') ?? '';
  const setFilter = (k: string, v: string) => navigate('/units', { programme: k === 'programme' ? v || undefined : programme || undefined, year: k === 'year' ? v || undefined : year || undefined }, true);
  const added = useRef(false);
  useEffect(() => {
    if (route.query.get('add') === '1' && !added.current) {
      added.current = true;
      const u = blankUnit(route.query.get('programme') ?? ws.programmes[0]?.id, Number(year) || 1);
      upsert('units', u);
      navigate(`/units/${u.id}`, undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const units = useMemo(
    () => sortUnits(ws.units.filter((u) => (!programme || u.programmeId === programme) && (!year || String(u.year) === year) && (!q || unitLabel(u).toLowerCase().includes(q.toLowerCase())))),
    [ws.units, programme, year, q],
  );
  const years = [...new Set(ws.units.map((u) => u.year))].sort((a, b) => a - b);
  const byYear = [...new Set(units.map((u) => u.year))].sort((a, b) => a - b);
  return (
    <Page
      title="Classes & course units"
      subtitle="Every course unit with its outline, contact hours, notes, assessments and question bank."
      actions={
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            const u = blankUnit(programme || ws.programmes[0]?.id, Number(year) || 1);
            upsert('units', u);
            navigate(`/units/${u.id}`);
          }}
        >
          Add course unit
        </Button>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input className="pl-9" placeholder="Search units" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search units" />
        </div>
        <Select aria-label="Programme" value={programme} onChange={(e) => setFilter('programme', e.target.value)}>
          <option value="">All programmes</option>
          {ws.programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
        <Select aria-label="Year" value={year} onChange={(e) => setFilter('year', e.target.value)}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </Select>
      </div>
      {units.length === 0 ? (
        <Empty icon={<BookOpen className="h-8 w-8" />} title={ws.units.length ? 'No units match' : 'No course units yet'} action={<LinkButton to="/curriculum" query={{ import: '1' }} variant="primary">Import a curriculum</LinkButton>}>
          Import a curriculum to create them automatically, or add units by hand.
        </Empty>
      ) : (
        byYear.map((y) => {
          const classes = ws.classes.filter((c) => c.year === y && (!programme || c.programmeId === programme));
          return (
            <section key={y} className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Year {y}</h2>
                {classes.map((c) => (
                  <a key={c.id} href={`#/students/class/${c.id}`} className="rounded-full bg-panel2 px-2.5 py-0.5 text-xs hover:text-accent">
                    {c.name} · {plural(ws.students.filter((s) => s.classId === c.id).length, 'student')}
                  </a>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {units
                  .filter((u) => u.year === y)
                  .map((u) => {
                    const notes = ws.notes.filter((n) => n.unitId === u.id);
                    const covered = u.topics.filter((t) => notes.some((n) => n.topicId === t.id)).length;
                    return (
                      <a key={u.id} href={`#/units/${u.id}`} className="block rounded-xl border border-line bg-panel p-4 transition hover:border-accent">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-xs text-muted">{u.code || 'No code'} · Semester {u.semester || '—'}</div>
                            <div className="font-semibold">{u.title}</div>
                          </div>
                          {!u.analysed && <Badge tone="warn">pending</Badge>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{unitTotalHours(u)} contact hours</span>
                          <span>{plural(u.topics.length, 'topic')}</span>
                          <span>{plural(ws.papers.filter((p) => p.unitId === u.id).length, 'paper')}</span>
                          <span>{plural(ws.bank.filter((b) => b.unitId === u.id).length, 'bank question')}</span>
                        </div>
                        {u.topics.length > 0 && (
                          <div className="mt-2">
                            <Progress value={covered / u.topics.length} label={`Notes for ${covered} of ${u.topics.length} topics`} />
                          </div>
                        )}
                      </a>
                    );
                  })}
              </div>
            </section>
          );
        })
      )}
    </Page>
  );
}

type Tab = 'outline' | 'notes' | 'assessments' | 'references';

function UnitPage({ id }: { id: string }) {
  const ws = useWorkspace();
  const route = useRoute();
  const { confirm, toast } = useUi();
  const { run, busy } = useAction();
  const unit = ws.units.find((u) => u.id === id);
  const tab = (route.query.get('tab') as Tab) || 'outline';
  if (!unit)
    return (
      <Page title="Course unit not found" back={{ to: '/units', label: 'Course units' }}>
        <Empty title="This unit was deleted or has not synced to this device yet." />
      </Page>
    );
  const programme = ws.programmes.find((p) => p.id === unit.programmeId);
  const set = (changes: Partial<Unit>) => patch('units', unit.id, changes);
  const notes = ws.notes.filter((n) => n.unitId === unit.id);
  const papers = ws.papers.filter((p) => p.unitId === unit.id);
  const refs = unitReferences(ws, unit);
  const classes = ws.classes.filter((c) => c.year === unit.year && (!unit.programmeId || c.programmeId === unit.programmeId || !c.programmeId));

  const del = async () => {
    if (!(await confirm(`Delete ${unitLabel(unit)}?`, { danger: true, ok: 'Delete', detail: `Its ${notes.length} lecture notes, ${papers.length} assessments, question bank and marks are deleted too.` }))) return;
    update((w) => ({
      ...w,
      units: w.units.filter((u) => u.id !== unit.id),
      notes: w.notes.filter((n) => n.unitId !== unit.id),
      papers: w.papers.filter((p) => p.unitId !== unit.id),
      bank: w.bank.filter((q) => q.unitId !== unit.id),
      marks: w.marks.filter((m) => m.unitId !== unit.id),
    }));
    toast('Course unit deleted');
    navigate('/units');
  };

  return (
    <Page
      back={programme ? { to: `/programmes/${programme.id}`, label: programme.title } : { to: '/units', label: 'Course units' }}
      title={unitLabel(unit)}
      subtitle={
        <span className="flex flex-wrap gap-x-3">
          <span>Year {unit.year}</span>
          <span>Semester {unit.semester || '—'}</span>
          <span>{unitTotalHours(unit)} contact hours</span>
          {unit.creditUnits > 0 && <span>{unit.creditUnits} credit units</span>}
          {classes.map((c) => (
            <A key={c.id} to={`/students/class/${c.id}/marks`} query={{ unit: unit.id }}>
              Marks: {c.name}
            </A>
          ))}
        </span>
      }
      actions={
        <>
          {programme && programme.sourceReferenceId && (
            <Button icon={<Wand2 className="h-4 w-4" />} busy={busy === 'extract'} onClick={() => void run('extract', () => analyseUnits(programme.id, [unit.id]), 'Outline re-read from the curriculum')}>
              {unit.analysed ? 'Re-read outline' : 'Extract outline'}
            </Button>
          )}
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => void del()} aria-label="Delete unit" />
        </>
      }
    >
      <Tabs<Tab>
        value={tab}
        onChange={(t) => navigate(`/units/${unit.id}`, { tab: t }, true)}
        tabs={[
          { id: 'outline', label: 'Outline & topics', count: unit.topics.length },
          { id: 'notes', label: 'Lecture notes', count: notes.length },
          { id: 'assessments', label: 'Assessments', count: papers.length },
          { id: 'references', label: 'References', count: refs.length },
        ]}
      />
      {tab === 'outline' && <OutlineTab unit={unit} set={set} />}
      {tab === 'notes' && <NotesTab unit={unit} />}
      {tab === 'assessments' && <AssessmentsTab unit={unit} />}
      {tab === 'references' && <ReferencesTab unit={unit} />}
    </Page>
  );
}

function OutlineTab({ unit, set }: { unit: Unit; set: (c: Partial<Unit>) => void }) {
  const ws = useWorkspace();
  const ranges = hourRanges(unit.topics);
  const topicHours = unit.topics.reduce((s, t) => s + t.hours, 0);
  const setTopic = (tid: string, changes: Partial<Topic>) => set({ topics: unit.topics.map((t) => (t.id === tid ? { ...t, ...changes } : t)) });
  const move = (i: number, d: number) => {
    const topics = [...unit.topics];
    const [t] = topics.splice(i, 1);
    topics.splice(i + d, 0, t);
    set({ topics });
  };
  const num = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card title="Unit details" className="lg:col-span-1">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Code">
              <EditableText value={unit.code} onCommit={(v) => set({ code: v })} />
            </Field>
            <Field label="Year">
              <EditableText type="number" value={String(unit.year)} onCommit={(v) => set({ year: Math.max(1, num(v) || 1) })} />
            </Field>
            <Field label="Semester">
              <EditableText type="number" value={String(unit.semester)} onCommit={(v) => set({ semester: num(v) })} />
            </Field>
          </div>
          <Field label="Title">
            <EditableText value={unit.title} onCommit={(v) => v.trim() && set({ title: v.trim() })} />
          </Field>
          <Field label="Programme">
            <Select value={unit.programmeId ?? ''} onChange={(e) => set({ programmeId: e.target.value || undefined })}>
              <option value="">None</option>
              {ws.programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {(['lecture', 'tutorial', 'practical', 'clinical', 'total'] as const).map((k) => (
              <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} h`}>
                <EditableText type="number" value={String(unit.hours[k])} onCommit={(v) => set({ hours: { ...unit.hours, [k]: num(v) } })} />
              </Field>
            ))}
            <Field label="Credits">
              <EditableText type="number" value={String(unit.creditUnits)} onCommit={(v) => set({ creditUnits: num(v) })} />
            </Field>
          </div>
          <Field label="Course description">
            <EditableText multiline value={unit.overview} onCommit={(v) => set({ overview: v })} />
          </Field>
          <Field label="Aims">
            <LinesEditor value={unit.aims} onCommit={(v) => set({ aims: v })} />
          </Field>
          <Field label="Learning outcomes">
            <LinesEditor value={unit.outcomes} onCommit={(v) => set({ outcomes: v })} rows={5} />
          </Field>
          <Field label="Teaching methods">
            <LinesEditor value={unit.teachingMethods} onCommit={(v) => set({ teachingMethods: v })} rows={3} />
          </Field>
          <Field label="Assessment">
            <EditableText multiline value={unit.assessment} onCommit={(v) => set({ assessment: v })} />
          </Field>
          <Field label="Recommended references">
            <LinesEditor value={unit.references} onCommit={(v) => set({ references: v })} rows={3} />
          </Field>
        </div>
      </Card>
      <Card
        className="lg:col-span-2"
        title={`Course outline — ${plural(unit.topics.length, 'topic')}, ${topicHours} of ${unitTotalHours(unit)} contact hours`}
        actions={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set({ topics: [...unit.topics, { id: uid('t-'), title: 'New topic', hours: 2, objectives: [], subtopics: [], practicals: '' }] })}>
            Add topic
          </Button>
        }
      >
        {unit.hoursEstimated && <p className="mb-3 rounded-lg bg-warn/10 p-2 text-xs text-warn">The curriculum did not give hours per topic, so they were shared out from the unit total. Adjust them if needed.</p>}
        {unit.topics.length === 0 ? (
          <Empty title="No topics yet">Extract the outline from the curriculum, or add topics with their contact hours.</Empty>
        ) : (
          <ol className="space-y-3">
            {unit.topics.map((t, i) => {
              const note = ws.notes.find((n) => n.topicId === t.id);
              return (
                <li key={t.id} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">{formatHours(ranges[t.id].start, ranges[t.id].end)}</span>
                    <div className="min-w-0 flex-1">
                      <EditableText value={t.title} onCommit={(v) => v.trim() && setTopic(t.id, { title: v.trim() })} ariaLabel={`Topic ${i + 1} title`} className="font-medium" />
                    </div>
                    <div className="w-20">
                      <EditableText type="number" value={String(t.hours)} onCommit={(v) => setTopic(t.id, { hours: num(v) })} ariaLabel="Contact hours" />
                    </div>
                    <span className="text-xs text-muted">h</span>
                    <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} icon={<ArrowUp className="h-3.5 w-3.5" />} onClick={() => move(i, -1)} />
                    <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === unit.topics.length - 1} icon={<ArrowDown className="h-3.5 w-3.5" />} onClick={() => move(i, 1)} />
                    <Button size="sm" variant="ghost" aria-label="Delete topic" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => set({ topics: unit.topics.filter((x) => x.id !== t.id) })} />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Learning objectives">
                      <LinesEditor value={t.objectives} onCommit={(v) => setTopic(t.id, { objectives: v })} rows={3} />
                    </Field>
                    <Field label="Subtopics / content">
                      <LinesEditor value={t.subtopics} onCommit={(v) => setTopic(t.id, { subtopics: v })} rows={3} />
                    </Field>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <EditableText value={t.practicals} placeholder="Practicals / activities" onCommit={(v) => setTopic(t.id, { practicals: v })} ariaLabel="Practicals" />
                    </div>
                    {note ? (
                      <A to={`/notes/${note.id}`}>
                        <FileText className="mr-1 inline h-3.5 w-3.5" />
                        Open notes
                      </A>
                    ) : (
                      <A to={`/units/${unit.id}`} query={{ tab: 'notes' }}>
                        No notes yet
                      </A>
                    )}
                    <A to="/bank" query={{ unit: unit.id, topic: t.id }}>
                      <ListChecks className="mr-1 inline h-3.5 w-3.5" />
                      {ws.bank.filter((b) => b.topicId === t.id).length} bank questions
                    </A>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}

function NotesTab({ unit }: { unit: Unit }) {
  const ws = useWorkspace();
  const jobs = useJobs();
  const { run } = useAction();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const refs = unitReferences(ws, unit);
  const [refIds, setRefIds] = useState<string[]>(() => refs.map((r) => r.id));
  const job = jobs.find((j) => j.id === `notes-${unit.id}`);
  const ranges = hourRanges(unit.topics);
  const notes = ws.notes.filter((n) => n.unitId === unit.id);
  const missing = unit.topics.filter((t) => !notes.some((n) => n.topicId === t.id)).map((t) => t.id);
  const other = notes.filter((n) => !n.topicId || !unit.topics.some((t) => t.id === n.topicId));

  const write = (topic?: Unit['topics'][number]) => {
    const t = now();
    const note = {
      id: uid('n-'),
      unitId: unit.id,
      topicId: topic?.id,
      title: topic?.title ?? 'New notes',
      markdown: topic ? `# ${topic.title}\n\n## Learning objectives\n${topic.objectives.map((o) => `- ${o}`).join('\n')}\n\n## Content\n\n` : '# New notes\n\n',
      hourStart: topic ? ranges[topic.id].start : 1,
      hourEnd: topic ? ranges[topic.id].end : 1,
      status: 'draft' as const,
      sourceIds: [],
      model: '',
      createdAt: t,
      updatedAt: t,
    };
    upsert('notes', note);
    navigate(`/notes/${note.id}`);
  };

  return (
    <div className="space-y-4">
      {job && (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
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
      <Card
        title="Lecture notes in teaching order (by contact hours)"
        actions={
          <>
            {missing.length > 0 && (
              <Button
                size="sm"
                variant="primary"
                icon={<Wand2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  setSelected(missing);
                  setOpen(true);
                }}
              >
                Generate missing ({missing.length})
              </Button>
            )}
            <Button size="sm" disabled={!selected.length} icon={<Wand2 className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
              Generate selected
            </Button>
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => write()}>
              Blank note
            </Button>
          </>
        }
      >
        {unit.topics.length === 0 ? (
          <Empty title="Add topics to the outline first">Notes are organised by the topics and contact hours in the outline.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {unit.topics.map((t) => {
              const note = notes.find((n) => n.topicId === t.id);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Checkbox checked={selected.includes(t.id)} onChange={(v) => setSelected(v ? [...selected, t.id] : selected.filter((x) => x !== t.id))} label={<span className="sr-only">Select {t.title}</span>} />
                  <span className="w-28 shrink-0 text-xs font-semibold text-accent">{formatHours(ranges[t.id].start, ranges[t.id].end)}</span>
                  <span className="min-w-0 flex-1 text-sm">{t.title}</span>
                  {note ? (
                    <>
                      <Badge tone={note.status === 'final' ? 'good' : 'warn'}>{note.status}</Badge>
                      <LinkButton size="sm" to={`/notes/${note.id}`} icon={<FileText className="h-3.5 w-3.5" />}>
                        Open
                      </LinkButton>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => write(t)}>
                      Write by hand
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {other.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-xs font-medium text-muted">Other notes</div>
            <ul className="space-y-1 text-sm">
              {other.map((n) => (
                <li key={n.id}>
                  <A to={`/notes/${n.id}`}>{n.title}</A>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Generate notes for ${plural(selected.length, 'topic')}`}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon={<Wand2 className="h-4 w-4" />}
              onClick={() => {
                setOpen(false);
                void run('notes', () => generateUnitNotes(unit.id, selected, { referenceIds: refIds, instructions }));
                setSelected([]);
              }}
            >
              Generate
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium text-muted">Write from these references</div>
            {refs.length === 0 ? (
              <p className="text-sm text-warn">
                No references are linked to this unit, so notes will use general textbook knowledge. <A to={`/units/${unit.id}`} query={{ tab: 'references' }}>Add references</A>.
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                {refs.map((r) => (
                  <Checkbox key={r.id} checked={refIds.includes(r.id)} onChange={(v) => setRefIds(v ? [...refIds, r.id] : refIds.filter((x) => x !== r.id))} label={<span className="text-xs">{r.name}</span>} />
                ))}
              </div>
            )}
          </div>
          <Field label="Extra instructions (optional)">
            <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Use Ugandan clinical guidelines; include a drug table; simple English for certificate students" />
          </Field>
          <p className="text-xs text-muted">
            Detail level: <strong>{ws.settings.noteDetail}</strong> (<A to="/settings">change</A>). Notes run in the background; you can keep working. Existing notes for these topics are replaced.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function AssessmentsTab({ unit }: { unit: Unit }) {
  const ws = useWorkspace();
  const papers = ws.papers.filter((p) => p.unitId === unit.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const bank = ws.bank.filter((b) => b.unitId === unit.id);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card
        className="lg:col-span-2"
        title="Exams, CATs and assignments"
        actions={
          <LinkButton size="sm" variant="primary" to="/assessments/new" query={{ unit: unit.id }} icon={<Plus className="h-3.5 w-3.5" />}>
            New assessment
          </LinkButton>
        }
      >
        {papers.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {papers.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <ClipboardList className="h-4 w-4 text-muted" />
                <A to={`/assessments/${p.id}`} className="min-w-0 flex-1">
                  {p.title}
                </A>
                <span className="text-xs text-muted">{KIND_LABEL[p.kind]}</span>
                <span className="text-xs text-muted">{paperMarks(p)} marks</span>
                <Badge tone={p.status === 'final' ? 'good' : 'warn'}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Question bank" actions={<LinkButton size="sm" to="/bank" query={{ unit: unit.id }}>Open</LinkButton>}>
        <div className="text-3xl font-bold">{bank.length}</div>
        <div className="mb-3 text-sm text-muted">questions with solutions</div>
        <ul className="space-y-1 text-xs">
          {unit.topics.map((t) => (
            <li key={t.id} className="flex justify-between gap-2">
              <A to="/bank" query={{ unit: unit.id, topic: t.id }} className="truncate">
                {t.title}
              </A>
              <span className="text-muted">{bank.filter((b) => b.topicId === t.id).length}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ReferencesTab({ unit }: { unit: Unit }) {
  const ws = useWorkspace();
  const refs = unitReferences(ws, unit);
  const { upload, busy, view } = useUploader({ unitIds: [unit.id] });
  const others = ws.references.filter((r) => !refs.includes(r));
  const link = (rid: string, on: boolean) => {
    const r = ws.references.find((x) => x.id === rid);
    if (!r) return;
    patch('references', rid, { unitIds: on ? [...new Set([...r.unitIds, unit.id])] : r.unitIds.filter((x) => x !== unit.id) });
    if (!on && unit.referenceIds.includes(rid)) patch('units', unit.id, { referenceIds: unit.referenceIds.filter((x) => x !== rid) });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card
        className="lg:col-span-2"
        title="References used for this unit"
        actions={
          <FileButton multiple accept={ACCEPT} variant="primary" icon={<Upload className="h-4 w-4" />} onFiles={(f) => void upload(f)} disabled={busy}>
            Upload
          </FileButton>
        }
      >
        {view && <div className="mb-3">{view}</div>}
        {refs.length === 0 ? (
          <p className="text-sm text-muted">Upload textbooks, guidelines, slides, past papers or photos. Notes and exams for this unit are written from them.</p>
        ) : (
          <ul className="divide-y divide-line">
            {refs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <A to={`/library/${r.id}`} className="min-w-0 flex-1 truncate">
                  {r.name}
                </A>
                <Badge>{CATEGORY_LABEL[r.category].split(' /')[0]}</Badge>
                <span className="text-xs text-muted">{r.text.length.toLocaleString()} chars</span>
                <Button size="sm" variant="ghost" onClick={() => link(r.id, false)}>
                  Unlink
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Link from the library">
        {others.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing else in the <A to="/library">library</A>.
          </p>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {others.map((r) => (
              <li key={r.id}>
                <Checkbox checked={false} onChange={() => link(r.id, true)} label={<span className="text-xs">{r.name}</span>} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

