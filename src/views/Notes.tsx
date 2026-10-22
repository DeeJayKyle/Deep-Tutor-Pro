import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Columns2, Download, Eye, FileText, Pencil, Presentation, Printer, Search, Trash2, Wand2 } from 'lucide-react';
import type { Note } from '../lib/model';
import { api } from '../lib/api';
import { exportDocument, exportPptx, fileName, saveBlob, type DocFormat } from '../lib/exporters';
import { formatHours, sortUnits } from '../lib/curriculum';
import { provenance } from '../lib/markdown';
import { unitLabel } from '../lib/workspace';
import { navigate, useRoute } from '../state/router';
import { patch, remove, useWorkspace } from '../state/store';
import { aiProvider, docMeta, formatDate, plural, programmeTitle } from '../state/helpers';
import { Markdown, Toc } from '../ui/Markdown';
import { formattingShortcut, MarkdownToolbar } from '../ui/MarkdownToolbar';
import { A, Badge, Button, Card, EditableText, Empty, Input, LinkButton, Page, Select, Textarea, cx, useAction, useUi } from '../ui/kit';

export default function NotesView() {
  const route = useRoute();
  if (route.parts[1]) return <NoteEditor id={route.parts[1]} />;
  return <NotesList />;
}

function NotesList() {
  const ws = useWorkspace();
  const [q, setQ] = useState('');
  const units = sortUnits(ws.units);
  const filtered = ws.notes.filter((n) => !q || `${n.title} ${n.markdown.slice(0, 5000)}`.toLowerCase().includes(q.toLowerCase()));
  const groups = units.map((u) => ({ unit: u, notes: filtered.filter((n) => n.unitId === u.id).sort((a, b) => a.hourStart - b.hourStart) })).filter((g) => g.notes.length);
  const orphans = filtered.filter((n) => !ws.units.some((u) => u.id === n.unitId));
  return (
    <Page title="Lecture notes" subtitle="Organised by course unit and sorted by the contact hours in the curriculum. Open a unit to generate notes for its topics.">
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <Input className="pl-9" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search notes" />
      </div>
      {groups.length === 0 && orphans.length === 0 ? (
        <Empty icon={<FileText className="h-8 w-8" />} title="No lecture notes yet" action={<LinkButton to="/units" variant="primary">Choose a course unit</LinkButton>}>
          Open a course unit › Lecture notes, then generate notes for its topics from your uploaded references.
        </Empty>
      ) : (
        <div className="space-y-4">
          {groups.map(({ unit, notes }) => (
            <Card key={unit.id} title={<A to={`/units/${unit.id}`} query={{ tab: 'notes' }}>{unitLabel(unit)}</A>} actions={<span className="text-xs text-muted">Year {unit.year} · {plural(notes.length, 'note')}</span>} padded={false}>
              <ul className="divide-y divide-line">
                {notes.map((n) => (
                  <li key={n.id}>
                    <a href={`#/notes/${n.id}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-panel2">
                      <span className="w-28 shrink-0 text-xs font-semibold text-accent">{formatHours(n.hourStart, n.hourEnd)}</span>
                      <span className="min-w-0 flex-1 text-sm">{n.title}</span>
                      <Badge tone={n.status === 'final' ? 'good' : 'warn'}>{n.status}</Badge>
                      <span className="text-xs text-muted">{formatDate(n.updatedAt)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {orphans.length > 0 && (
            <Card title="Notes without a course unit">
              <ul className="space-y-1 text-sm">
                {orphans.map((n) => (
                  <li key={n.id}>
                    <A to={`/notes/${n.id}`}>{n.title}</A>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
}

const QUICK_EDITS = [
  'Simplify the language for certificate-level students',
  'Add more worked examples and clinical case scenarios',
  'Add a summary comparison table',
  'Add 5 revision MCQs with answers at the end',
  'Expand each contact hour section with more detail',
  'Tighten and shorten by about a third',
];

function NoteEditor({ id }: { id: string }) {
  const ws = useWorkspace();
  const { toast, confirm } = useUi();
  const { busy, run } = useAction();
  const note = ws.notes.find((n) => n.id === id);
  const [draft, setDraft] = useState(note?.markdown ?? '');
  const [mode, setMode] = useState<'preview' | 'edit' | 'split'>(() => (window.innerWidth >= 1280 ? 'split' : 'preview'));
  const [instruction, setInstruction] = useState('');
  const [undo, setUndo] = useState<string | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(note?.markdown ?? '');
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Save edits shortly after typing stops.
  useEffect(() => {
    if (!note || draft === note.markdown) return;
    const t = setTimeout(() => patch('notes', note.id, { markdown: draft }), 600);
    return () => clearTimeout(t);
  }, [draft, note]);

  const unit = ws.units.find((u) => u.id === note?.unitId);
  const siblings = useMemo(() => ws.notes.filter((n) => n.unitId === note?.unitId).sort((a, b) => a.hourStart - b.hourStart), [ws.notes, note?.unitId]);
  if (!note)
    return (
      <Page title="Note not found" back={{ to: '/notes', label: 'Lecture notes' }}>
        <Empty title="This note was deleted or has not synced to this device yet." />
      </Page>
    );
  const idx = siblings.findIndex((n) => n.id === note.id);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];
  const set = (changes: Partial<Note>) => patch('notes', note.id, changes);
  const prov = provenance(draft);
  const sources = ws.references.filter((r) => note.sourceIds.includes(r.id));
  const meta = docMeta(ws, note.title, [unit ? unitLabel(unit) : '', formatHours(note.hourStart, note.hourEnd)].filter(Boolean).join(' · '), note.status, !!note.model);

  const doExport = (format: DocFormat) =>
    run(`export-${format}`, async () => {
      const res = await exportDocument(format, draft, meta);
      if (res.saved) toast(`Saved ${res.name} to ${res.method}`);
    });

  const slides = () =>
    run('slides', async () => {
      const provider = aiProvider();
      const res = await api.slides(note.title, draft, provider);
      const blob = await exportPptx(res.markdown, meta);
      const saved = await saveBlob(blob, fileName(`${note.title} slides`, 'pptx'));
      if (saved.saved) toast(`Slide deck saved as ${saved.name}`);
    });

  const revise = (text: string) =>
    run('revise', async () => {
      const provider = aiProvider();
      const res = await api.revise(text, draft, `${programmeTitle(ws, unit)} ${unit ? unitLabel(unit) : ''}`.trim(), provider);
      setUndo(draft);
      setDraft(res.markdown);
      set({ markdown: res.markdown, model: res.model });
      setInstruction('');
      toast('Notes revised — review the changes (Undo is available)');
    });

  return (
    <Page
      back={unit ? { to: `/units/${unit.id}?tab=notes`, label: unitLabel(unit) } : { to: '/notes', label: 'Lecture notes' }}
      title={<EditableText value={note.title} onCommit={(v) => v.trim() && set({ title: v.trim() })} ariaLabel="Note title" className="!border-transparent !bg-transparent !px-0 text-xl font-bold sm:text-2xl" />}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-accent">{formatHours(note.hourStart, note.hourEnd)}</span>
          {unit && <A to={`/units/${unit.id}`}>{unitLabel(unit)}</A>}
          <span>Updated {formatDate(note.updatedAt)}</span>
          {note.model && <span>AI: {note.model}</span>}
          {prov.total > 0 && (
            <span title="Share of statements tagged with an uploaded reference">
              {Math.round(prov.ratio * 100)}% from your references
            </span>
          )}
        </span>
      }
      actions={
        <>
          <Button variant={note.status === 'final' ? 'secondary' : 'primary'} onClick={() => set({ status: note.status === 'final' ? 'draft' : 'final' })}>
            {note.status === 'final' ? 'Mark as draft' : 'Approve as final'}
          </Button>
          <Button
            variant="danger"
            aria-label="Delete note"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              if (await confirm('Delete these notes?', { danger: true, ok: 'Delete' })) {
                remove('notes', note.id);
                navigate(unit ? `/units/${unit.id}` : '/notes', unit ? { tab: 'notes' } : undefined);
              }
            }}
          />
        </>
      }
    >
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line p-0.5">
          {(
            [
              ['preview', Eye, 'Read'],
              ['edit', Pencil, 'Edit'],
              ['split', Columns2, 'Side by side'],
            ] as const
          ).map(([m, Icon, label]) => (
            <button key={m} onClick={() => setMode(m)} className={cx('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs', mode === m ? 'bg-accent-solid text-accent-ink' : 'text-muted hover:text-ink')}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} busy={busy === 'export-docx'} onClick={() => void doExport('docx')}>
          Word
        </Button>
        <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} busy={busy === 'export-pdf'} onClick={() => void doExport('pdf')}>
          PDF
        </Button>
        <Button size="sm" icon={<Presentation className="h-3.5 w-3.5" />} busy={busy === 'export-pptx'} onClick={() => void doExport('pptx')}>
          PowerPoint
        </Button>
        <Button size="sm" icon={<Wand2 className="h-3.5 w-3.5" />} busy={busy === 'slides'} onClick={() => void slides()} title="AI condenses the notes into a slide deck with speaker notes">
          AI slide deck
        </Button>
        <Button size="sm" variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>
          Print
        </Button>
        {undo !== null && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(undo);
              set({ markdown: undo });
              setUndo(null);
            }}
          >
            Undo AI edit
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <div className={cx('grid gap-4', mode === 'split' && 'lg:grid-cols-2')}>
          {mode !== 'preview' && (
            <div className="min-w-0">
              <MarkdownToolbar target={editor} onChange={setDraft} />
              <Textarea
                ref={editor}
                aria-label="Note text"
                className="min-h-[70vh] rounded-t-none font-mono text-[13px] leading-relaxed"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => formattingShortcut(e, setDraft)}
              />
            </div>
          )}
          {mode !== 'edit' && (
            <Card className="min-w-0">
              <Markdown source={draft} />
            </Card>
          )}
        </div>
        <aside className="no-print space-y-4">
          <Card title="Edit with AI">
            <Textarea rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Tell the AI what to change…" aria-label="AI instruction" />
            <Button className="mt-2 w-full" variant="primary" icon={<Wand2 className="h-4 w-4" />} busy={busy === 'revise'} disabled={!instruction.trim()} onClick={() => void revise(instruction)}>
              Apply
            </Button>
            <div className="mt-3 space-y-1">
              {QUICK_EDITS.map((q) => (
                <button key={q} disabled={!!busy} onClick={() => void revise(q)} className="block w-full rounded-md px-2 py-1 text-left text-xs text-muted hover:bg-panel2 hover:text-ink disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
          </Card>
          <Card title="Contents">
            <Toc source={draft} onJump={() => mode === 'edit' && setMode('preview')} />
          </Card>
          <Card title="Details">
            <div className="space-y-2 text-sm">
              <label className="block text-xs text-muted">Course unit</label>
              <Select value={note.unitId} onChange={(e) => set({ unitId: e.target.value })} aria-label="Course unit">
                <option value="">None</option>
                {sortUnits(ws.units).map((u) => (
                  <option key={u.id} value={u.id}>
                    {unitLabel(u)}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted">From hour</label>
                  <EditableText ariaLabel="From contact hour" type="number" value={String(note.hourStart)} onCommit={(v) => set({ hourStart: Math.max(0, Number(v) || 0) })} />
                </div>
                <div>
                  <label className="block text-xs text-muted">To hour</label>
                  <EditableText ariaLabel="To contact hour" type="number" value={String(note.hourEnd)} onCommit={(v) => set({ hourEnd: Math.max(0, Number(v) || 0) })} />
                </div>
              </div>
              {sources.length > 0 && (
                <div>
                  <div className="text-xs text-muted">Written from</div>
                  <ol className="list-decimal pl-5 text-xs">
                    {sources.map((r) => (
                      <li key={r.id}>
                        <A to={`/library/${r.id}`}>{r.name}</A>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {unit && (
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <A to="/assessments/new" query={{ unit: unit.id, topic: note.topicId }}>
                    Set a test on this topic
                  </A>
                  <A to="/bank" query={{ unit: unit.id, topic: note.topicId }}>
                    Question bank
                  </A>
                  <A to="/solve" query={{ unit: unit.id }}>
                    Ask Deep Solve
                  </A>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <div className="no-print mt-6 flex flex-wrap justify-between gap-2 [&>a]:max-w-full">
        {prev ? (
          <LinkButton to={`/notes/${prev.id}`} icon={<ArrowLeft className="h-4 w-4" />}>
            <span className="min-w-0 max-w-[60vw] truncate sm:max-w-[40vw]">{prev.title}</span>
          </LinkButton>
        ) : (
          <span />
        )}
        {next && (
          <LinkButton to={`/notes/${next.id}`}>
            <span className="min-w-0 max-w-[60vw] truncate sm:max-w-[40vw]">{next.title}</span>
            <ArrowRight className="h-4 w-4" />
          </LinkButton>
        )}
      </div>
    </Page>
  );
}
