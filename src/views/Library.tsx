import { useMemo, useState } from 'react';
import { FileSearch, GraduationCap, Library as LibraryIcon, Link2, ScanText, Search, Trash2, Upload } from 'lucide-react';
import type { Reference, ReferenceCategory } from '../lib/model';
import { ACCEPT } from '../lib/extract';
import { sortUnits } from '../lib/curriculum';
import { unitLabel } from '../lib/workspace';
import { patch, remove, useWorkspace } from '../state/store';
import { useRoute } from '../state/router';
import { addReference, CATEGORY_LABEL, formatBytes } from '../state/library';
import { formatDate } from '../state/helpers';
import { A, Badge, Button, Card, Checkbox, Empty, Field, FileButton, Input, LinkButton, Modal, Page, Progress, Select, Textarea, useUi } from '../ui/kit';

interface Job {
  name: string;
  message: string;
  fraction: number;
  error?: string;
  done?: boolean;
}

export function useUploader(defaults: { category?: ReferenceCategory; unitIds?: string[] } = {}) {
  const { toast } = useUi();
  const [jobs, setJobs] = useState<Job[]>([]);
  const upload = async (files: File[]): Promise<Reference[]> => {
    const added: Reference[] = [];
    setJobs(files.map((f) => ({ name: f.name, message: 'Waiting…', fraction: 0 })));
    for (const [i, file] of files.entries()) {
      const set = (j: Partial<Job>) => setJobs((all) => all.map((x, k) => (k === i ? { ...x, ...j } : x)));
      try {
        const ref = await addReference(file, { ...defaults, onProgress: (message, fraction) => set({ message, fraction: fraction ?? 0 }) });
        added.push(ref);
        set({ message: `Added — ${ref.text.length.toLocaleString()} characters${ref.ocrPages ? `, ${ref.ocrPages} page(s) read by OCR` : ''}`, fraction: 1, done: true });
      } catch (err) {
        set({ error: (err as Error).message, done: true });
      }
    }
    if (added.length) toast(`${added.length} document${added.length === 1 ? '' : 's'} added to the library`);
    return added;
  };
  const busy = jobs.some((j) => !j.done);
  const view = jobs.length ? (
    <div className="space-y-2 rounded-lg border border-line p-3">
      {jobs.map((j, i) => (
        <div key={i}>
          <div className="flex justify-between gap-2 text-xs">
            <span className="truncate font-medium">{j.name}</span>
            {j.done && !j.error && <span className="text-good">Done</span>}
          </div>
          {j.error ? <div className="text-xs text-bad">{j.error}</div> : <Progress value={j.fraction} label={j.message} />}
        </div>
      ))}
      {!busy && (
        <Button size="sm" variant="ghost" onClick={() => setJobs([])}>
          Clear
        </Button>
      )}
    </div>
  ) : null;
  return { upload, busy, view };
}

export default function LibraryView() {
  const ws = useWorkspace();
  const route = useRoute();
  const { confirm, toast } = useUi();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'' | ReferenceCategory>('');
  const [unitFilter, setUnitFilter] = useState(route.query.get('unit') ?? '');
  const { upload, busy, view } = useUploader({ unitIds: unitFilter ? [unitFilter] : [] });
  const [dragging, setDragging] = useState(false);
  const openId = route.parts[1];
  const open = ws.references.find((r) => r.id === openId);
  const units = sortUnits(ws.units);

  const list = useMemo(
    () =>
      ws.references
        .filter((r) => (!cat || r.category === cat) && (!unitFilter || r.unitIds.includes(unitFilter)) && (!q || `${r.name} ${r.text.slice(0, 20000)}`.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
    [ws.references, cat, unitFilter, q],
  );

  return (
    <Page
      title="Reference library"
      subtitle="Textbooks, guidelines, past papers, slides and photos. Text is read on this device (with OCR for scans and images) and used to ground notes and exams."
      actions={
        <FileButton multiple accept={ACCEPT} variant="primary" icon={<Upload className="h-4 w-4" />} onFiles={(f) => void upload(f)} disabled={busy}>
          Upload documents
        </FileButton>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = [...e.dataTransfer.files];
          if (files.length) void upload(files);
        }}
        className={`mb-4 rounded-xl border-2 border-dashed p-5 text-center text-sm transition ${dragging ? 'border-accent bg-accent/10' : 'border-line text-muted'}`}
      >
        Drop files here — PDF (including scanned), Word, PowerPoint, Excel, OpenDocument, text, HTML or photos of pages.
      </div>
      {view && <div className="mb-4">{view}</div>}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input className="pl-9" placeholder="Search names and contents" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search library" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value as ReferenceCategory | '')} aria-label="Category">
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} aria-label="Course unit">
          <option value="">All course units</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {unitLabel(u)}
            </option>
          ))}
        </Select>
      </div>

      {list.length === 0 ? (
        <Empty icon={<LibraryIcon className="h-8 w-8" />} title={ws.references.length ? 'No documents match' : 'Your library is empty'}>
          Upload reference books and materials. Link them to course units so lecture notes and exams are written from them.
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <div className="mb-2 flex items-start justify-between gap-2">
                <a href={`#/library/${r.id}`} className="min-w-0 font-medium hover:text-accent">
                  <span className="line-clamp-2 break-words">{r.name}</span>
                </a>
                <Badge tone={r.category === 'curriculum' ? 'accent' : 'muted'}>{CATEGORY_LABEL[r.category].split(' /')[0]}</Badge>
              </div>
              <div className="mb-2 text-xs text-muted">
                {formatBytes(r.size)}
                {r.pages ? ` · ${r.pages} page${r.pages === 1 ? '' : 's'}` : ''}
                {r.ocrPages ? ` · ${r.ocrPages} by OCR` : ''} · {formatDate(r.addedAt)}
              </div>
              <p className="mb-3 line-clamp-3 text-xs text-muted">{r.text.slice(0, 400)}</p>
              <div className="mb-3 flex flex-wrap gap-1">
                {r.unitIds.map((id) => {
                  const u = ws.units.find((x) => x.id === id);
                  return u ? (
                    <a key={id} href={`#/units/${u.id}`} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                      {u.code || u.title}
                    </a>
                  ) : null;
                })}
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5">
                <LinkButton size="sm" to={`/library/${r.id}`} icon={<FileSearch className="h-3.5 w-3.5" />}>
                  Open
                </LinkButton>
                {r.category === 'curriculum' && (
                  <LinkButton size="sm" to="/curriculum" query={{ import: '1', ref: r.id }} icon={<GraduationCap className="h-3.5 w-3.5" />}>
                    Analyse
                  </LinkButton>
                )}
                {r.category === 'past_paper' && (
                  <LinkButton size="sm" to="/assessments/new" query={{ formatFrom: r.id }} icon={<ScanText className="h-3.5 w-3.5" />}>
                    Use format
                  </LinkButton>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${r.name}`}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={async () => {
                    if (await confirm(`Delete “${r.name}”?`, { danger: true, ok: 'Delete', detail: 'Notes already written from it are kept.' })) {
                      remove('references', r.id);
                      toast('Document deleted');
                    }
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <ReferenceDialog reference={open} />}
    </Page>
  );
}

function ReferenceDialog({ reference: r }: { reference: Reference }) {
  const ws = useWorkspace();
  const close = () => (window.location.hash = '#/library');
  const [text, setText] = useState(r.text);
  const units = sortUnits(ws.units);
  return (
    <Modal
      open
      wide
      onClose={close}
      title={r.name}
      footer={
        <>
          <Button onClick={close}>Close</Button>
          <Button
            variant="primary"
            disabled={text === r.text}
            onClick={() => {
              patch('references', r.id, { text });
              close();
            }}
          >
            Save text
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-3 md:col-span-1">
          <Field label="Name">
            <Input defaultValue={r.name} onBlur={(e) => e.target.value.trim() && patch('references', r.id, { name: e.target.value.trim() })} />
          </Field>
          <Field label="Category">
            <Select value={r.category} onChange={(e) => patch('references', r.id, { category: e.target.value as ReferenceCategory })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted">
              <Link2 className="h-3.5 w-3.5" /> Used for these course units
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
              {units.length === 0 && <p className="text-xs text-muted">No course units yet.</p>}
              {units.map((u) => (
                <Checkbox
                  key={u.id}
                  checked={r.unitIds.includes(u.id)}
                  onChange={(v) => patch('references', r.id, { unitIds: v ? [...r.unitIds, u.id] : r.unitIds.filter((x) => x !== u.id) })}
                  label={<span className="text-xs">{unitLabel(u)}</span>}
                />
              ))}
            </div>
          </div>
          {r.unitIds.length > 0 && (
            <div className="text-xs text-muted">
              Open: {r.unitIds.map((id, i) => {
                const u = ws.units.find((x) => x.id === id);
                return u ? (
                  <span key={id}>
                    {i ? ', ' : ''}
                    <A to={`/units/${u.id}`}>{u.code || u.title}</A>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <Field label={`Extracted text (${text.length.toLocaleString()} characters) — correct OCR mistakes here`}>
            <Textarea className="h-[55vh] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
