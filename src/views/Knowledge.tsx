import { useCallback, useEffect, useState } from 'react';
import { Database, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { getSession, knowledgeBases, type KnowledgeBaseInfo } from '../lib/api';
import { slugify } from '../lib/markdown';
import { useWorkspace } from '../state/store';
import { A, Badge, Button, Card, Checkbox, Empty, Field, FileButton, Input, LinkButton, Modal, Page, Spinner, useAction, useUi } from '../ui/kit';

/** Library documents become plain-text files for DeepTutor's knowledge-base indexer. */
function refsAsFiles(refs: { name: string; text: string }[]): File[] {
  return refs.map((r) => new File([r.text], `${slugify(r.name.replace(/\.[^.]+$/, '')) || 'document'}.txt`, { type: 'text/plain' }));
}

export default function KnowledgeView() {
  const ws = useWorkspace();
  const { toast, confirm } = useUi();
  const { busy, run } = useAction();
  const [items, setItems] = useState<KnowledgeBaseInfo[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const signedIn = !!getSession();

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await knowledgeBases.list());
    } catch (err) {
      setError((err as Error).message);
      setItems([]);
    }
  }, []);
  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  const create = () =>
    run('create', async () => {
      const kbName = slugify(name).replace(/-/g, '_') || 'tutor_kb';
      const all = [...refsAsFiles(ws.references.filter((r) => chosen.includes(r.id))), ...files];
      if (!all.length) throw new Error('Choose library documents or upload files.');
      await knowledgeBases.create(kbName, all);
      setCreating(false);
      setName('');
      setChosen([]);
      setFiles([]);
      toast(`Knowledge base “${kbName}” created — indexing runs on the server and can take a few minutes`);
      await load();
    });

  if (!signedIn)
    return (
      <Page title="Knowledge bases">
        <Empty icon={<Database className="h-8 w-8" />} title="Sign in to use knowledge bases" action={<LinkButton to="/settings" variant="primary">Sign in</LinkButton>}>
          Knowledge bases are indexed on your DeepTutor server so the tutor chat and Deep Research can search your own books and notes.
        </Empty>
      </Page>
    );

  return (
    <Page
      title="Knowledge bases"
      subtitle="Searchable collections of your references on the DeepTutor server. Tutor chat and Deep Research can answer from them, with citations."
      actions={
        <>
          <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
            Refresh
          </Button>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            New knowledge base
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-bad/10 p-3 text-sm text-bad">{error}</p>}
      {items === null ? (
        <Spinner label="Loading…" />
      ) : items.length === 0 ? (
        <Empty icon={<Database className="h-8 w-8" />} title="No knowledge bases yet" action={<Button variant="primary" onClick={() => setCreating(true)}>Create one from your library</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((k) => {
            const docs = k.statistics?.raw_documents ?? k.statistics?.documents ?? k.statistics?.files;
            return (
              <Card key={k.name} title={k.name} actions={<Badge tone={k.status === 'ready' ? 'good' : k.status === 'error' ? 'bad' : 'warn'}>{k.status ?? 'unknown'}</Badge>}>
                <div className="mb-3 text-sm text-muted">
                  {docs !== undefined && <span>{docs} documents</span>}
                  {k.progress?.message && <div className="text-xs">{k.progress.message}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <FileButton
                    multiple
                    icon={<Upload className="h-3.5 w-3.5" />}
                    onFiles={(f) => void run(`up-${k.name}`, async () => { await knowledgeBases.upload(k.name, f); await load(); }, 'Files added; indexing on the server')}
                  >
                    Add files
                  </FileButton>
                  <LinkButton size="sm" to="/research/chat">
                    Ask it
                  </LinkButton>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${k.name}`}
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    busy={busy === `del-${k.name}`}
                    onClick={async () => {
                      if (await confirm(`Delete knowledge base “${k.name}”?`, { danger: true, ok: 'Delete', detail: 'Your library documents on this device are not affected.' }))
                        void run(`del-${k.name}`, async () => {
                          await knowledgeBases.remove(k.name);
                          await load();
                        });
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New knowledge base"
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" busy={busy === 'create'} disabled={!name.trim() || (!chosen.length && !files.length)} onClick={() => void create()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" hint="Letters, numbers and underscores">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. pharmacology_year1" />
          </Field>
          <div>
            <div className="mb-1 text-xs font-medium text-muted">From your library ({ws.references.length})</div>
            {ws.references.length === 0 ? (
              <p className="text-xs text-muted">
                The <A to="/library">library</A> is empty.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                {ws.references.map((r) => (
                  <Checkbox key={r.id} checked={chosen.includes(r.id)} onChange={(v) => setChosen(v ? [...chosen, r.id] : chosen.filter((x) => x !== r.id))} label={<span className="text-xs">{r.name}</span>} />
                ))}
              </div>
            )}
          </div>
          <div>
            <FileButton multiple icon={<Upload className="h-4 w-4" />} onFiles={(f) => setFiles([...files, ...f])}>
              Upload files too
            </FileButton>
            {files.length > 0 && <div className="mt-1 text-xs text-muted">{files.map((f) => f.name).join(', ')}</div>}
          </div>
        </div>
      </Modal>
    </Page>
  );
}
