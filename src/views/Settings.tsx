import { useEffect, useState } from 'react';
import { CloudDownload, Download, LogIn, LogOut, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { GradeBand, GradeComponent, ProviderChoice, Workspace } from '../lib/model';
import { cloud, DEFAULT_SERVER, getSession, sameOriginServer, signIn, signOut, status as serverStatus, type ServerStatus, type SyncMeta } from '../lib/api';
import { saveBlob } from '../lib/exporters';
import { storageEstimate } from '../lib/db';
import { mergeWorkspaces, sha256 } from '../lib/sync';
import { DEFAULT_BANDS, DEFAULT_COMPONENTS, normalizeWorkspace, uid } from '../lib/workspace';
import { navigate, useRoute } from '../state/router';
import { replaceWorkspace, runSync, setSettings, store, useSyncStatus, useWorkspace } from '../state/store';
import { formatBytes } from '../state/library';
import { APP_VERSION } from '../lib/version';
import { Badge, Button, Card, EditableText, Field, FileButton, Input, Page, Select, Tabs, useAction, useUi } from '../ui/kit';

type Tab = 'account' | 'ai' | 'institution' | 'grading' | 'data';

export default function SettingsView() {
  const route = useRoute();
  const tab = (route.query.get('tab') as Tab) || 'account';
  return (
    <Page title="Settings" subtitle={`Deep Tutor Pro ${APP_VERSION}`}>
      <Tabs<Tab>
        value={tab}
        onChange={(t) => navigate('/settings', { tab: t }, true)}
        tabs={[
          { id: 'account', label: 'Account & server' },
          { id: 'ai', label: 'AI provider' },
          { id: 'institution', label: 'Institution' },
          { id: 'grading', label: 'Grading' },
          { id: 'data', label: 'Sync, backup & data' },
        ]}
      />
      {tab === 'account' && <Account />}
      {tab === 'ai' && <Ai />}
      {tab === 'institution' && <Institution />}
      {tab === 'grading' && <Grading />}
      {tab === 'data' && <Data />}
    </Page>
  );
}

function Account() {
  const { toast } = useUi();
  const { busy, run } = useAction();
  const session = getSession();
  const [server, setServer] = useState(session?.server ?? sameOriginServer() ?? DEFAULT_SERVER);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [st, setSt] = useState<ServerStatus | null>(null);
  const [, force] = useState(0);
  useEffect(() => {
    if (session) serverStatus().then(setSt).catch(() => setSt(null));
  }, [session]);
  if (session)
    return (
      <Card title="Signed in">
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted">Account:</span> <strong>{session.username}</strong> ({session.role})
          </div>
          <div>
            <span className="text-muted">Server:</span> {session.server}
          </div>
          {st && (
            <div>
              <span className="text-muted">AI:</span> {st.providers.length ? st.providers.map((p) => `${p.label} (${p.model})`).join(', ') : st.ai_available ? 'server default model' : 'not configured on the server'}
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void runSync()}>
            Sync now
          </Button>
          {session.token && (
            <Button
              icon={<LogOut className="h-4 w-4" />}
              onClick={async () => {
                await signOut();
                force((n) => n + 1);
                toast('Signed out. Your data stays on this device.', 'info');
              }}
            >
              Sign out
            </Button>
          )}
        </div>
      </Card>
    );
  return (
    <Card title="Sign in to your DeepTutor server">
      <p className="mb-4 max-w-2xl text-sm text-muted">
        AI features and cloud sync run on your DeepTutor server, which holds the OpenAI / Gemini keys — they are never stored in this app. Use the same account as the DeepTutor website. Without signing in, everything except AI and sync still works on this device.
      </p>
      <form
        className="grid max-w-md gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run('login', async () => {
            await signIn(server, username.trim(), password);
            setPassword('');
            force((n) => n + 1);
          }, 'Signed in — AI and cloud sync are on');
        }}
      >
        <Field label="Server address">
          <Input value={server} onChange={(e) => setServer(e.target.value)} inputMode="url" />
        </Field>
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Button type="submit" variant="primary" icon={<LogIn className="h-4 w-4" />} busy={busy === 'login'} disabled={!username || !password}>
          Sign in
        </Button>
        <p className="text-xs text-muted">The first sign-in can take up to a minute while the server wakes up.</p>
      </form>
    </Card>
  );
}

function Ai() {
  const ws = useWorkspace();
  const [st, setSt] = useState<ServerStatus | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!getSession()) return;
    serverStatus()
      .then(setSt)
      .catch((e) => setErr((e as Error).message));
  }, []);
  const available = new Set(st?.providers.map((p) => p.id));
  const options: { id: ProviderChoice; label: string; detail: string }[] = [
    { id: 'auto', label: 'Automatic', detail: 'OpenAI when its key is on the server, otherwise Gemini.' },
    { id: 'gemini', label: 'Google Gemini', detail: 'Reads photos and voice notes directly. Free tier available.' },
    { id: 'openai', label: 'OpenAI', detail: 'Used once OPENAI_API_KEY is added to the server.' },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Which AI writes your content">
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 hover:border-accent">
              <input type="radio" name="provider" className="mt-1" checked={ws.settings.provider === o.id} onChange={() => setSettings({ provider: o.id })} />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {o.label}
                  {st && o.id !== 'auto' && <Badge tone={available.has(o.id as 'gemini' | 'openai') ? 'good' : 'muted'}>{available.has(o.id as 'gemini' | 'openai') ? 'available' : 'no key on server'}</Badge>}
                  {st && o.id === 'auto' && <Badge tone="accent">now: {st.default_provider}</Badge>}
                </div>
                <div className="text-xs text-muted">{o.detail}</div>
              </div>
            </label>
          ))}
        </div>
        {err && <p className="mt-2 text-xs text-bad">{err}</p>}
        {!getSession() && <p className="mt-2 text-xs text-muted">Sign in to see which providers your server offers.</p>}
        <p className="mt-3 text-xs text-muted">If the chosen provider has no key on the server, the other one is used automatically.</p>
      </Card>
      <Card title="Lecture notes">
        <Field label="Default detail level">
          <Select value={ws.settings.noteDetail} onChange={(e) => setSettings({ noteDetail: e.target.value as Workspace['settings']['noteDetail'] })}>
            <option value="brief">Brief (≈1,000 words per topic)</option>
            <option value="standard">Standard (≈2,500 words per topic)</option>
            <option value="comprehensive">Comprehensive (≈4,500 words per topic)</option>
          </Select>
        </Field>
        <p className="mt-3 text-xs text-muted">AI drafts are always marked as drafts until you approve them. Statements taken from your references are tagged [Source: S#].</p>
      </Card>
    </div>
  );
}

function Institution() {
  const ws = useWorkspace();
  const s = ws.settings;
  return (
    <Card title="Shown on exported documents">
      <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
        <Field label="Institution name">
          <EditableText value={s.institution} onCommit={(v) => setSettings({ institution: v })} placeholder="e.g. Kampala School of Pharmacy" />
        </Field>
        <Field label="Department">
          <EditableText value={s.department} onCommit={(v) => setSettings({ department: v })} />
        </Field>
        <Field label="Your name">
          <EditableText value={s.tutorName} onCommit={(v) => setSettings({ tutorName: v })} />
        </Field>
        <Field label="Current academic year">
          <EditableText value={s.academicYear} onCommit={(v) => setSettings({ academicYear: v })} />
        </Field>
        <Field label="Appearance">
          <Select value={s.theme} onChange={(e) => setSettings({ theme: e.target.value as Workspace['settings']['theme'] })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Follow the device</option>
          </Select>
        </Field>
      </div>
    </Card>
  );
}

function Grading() {
  const ws = useWorkspace();
  const { components, bands, passMark } = ws.settings;
  const total = components.reduce((s, c) => s + c.weight, 0);
  const setC = (i: number, c: Partial<GradeComponent>) => setSettings({ components: components.map((x, j) => (j === i ? { ...x, ...c } : x)) });
  const setB = (i: number, b: Partial<GradeBand>) => setSettings({ bands: bands.map((x, j) => (j === i ? { ...x, ...b } : x)).sort((a, b2) => b2.min - a.min) });
  const n = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card
        title={
          <>
            Assessment components — weights total <span className={total === 100 ? 'text-good' : 'text-warn'}>{total}%</span>
          </>
        }
        actions={
          <>
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setSettings({ components: [...components, { id: uid('c-'), name: 'New component', kind: 'coursework', weight: 0, maxScore: 100 }] })}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSettings({ components: DEFAULT_COMPONENTS.map((c) => ({ ...c })) })}>
              Reset
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-muted">Each component is entered out of its own maximum and counts for its weight in the final mark (e.g. two CATs 30%, assignment 10%, exam 60%). Removing a component hides its marks but keeps them.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-1">Name</th>
                <th className="p-1">Kind</th>
                <th className="p-1">Out of</th>
                <th className="p-1">Weight %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="p-1">
                    <EditableText value={c.name} ariaLabel="Component name" onCommit={(v) => v.trim() && setC(i, { name: v.trim() })} />
                  </td>
                  <td className="p-1">
                    <Select aria-label="Kind" value={c.kind} onChange={(e) => setC(i, { kind: e.target.value as GradeComponent['kind'] })}>
                      <option value="coursework">Coursework / CAT</option>
                      <option value="assignment">Assignment</option>
                      <option value="practical">Practical</option>
                      <option value="exam">Exam</option>
                      <option value="other">Other</option>
                    </Select>
                  </td>
                  <td className="w-24 p-1">
                    <EditableText type="number" ariaLabel="Maximum score" value={String(c.maxScore)} onCommit={(v) => setC(i, { maxScore: Math.max(1, n(v)) })} />
                  </td>
                  <td className="w-24 p-1">
                    <EditableText type="number" ariaLabel="Weight" value={String(c.weight)} onCommit={(v) => setC(i, { weight: n(v) })} />
                  </td>
                  <td className="p-1">
                    <Button size="sm" variant="ghost" aria-label="Remove component" icon={<Trash2 className="h-3.5 w-3.5" />} disabled={components.length < 2} onClick={() => setSettings({ components: components.filter((_, j) => j !== i) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card
        title="Grade bands"
        actions={
          <>
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setSettings({ bands: [...bands, { min: 0, grade: '?', points: 0, remark: '' }].sort((a, b) => b.min - a.min) })}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSettings({ bands: DEFAULT_BANDS.map((b) => ({ ...b })) })}>
              Reset
            </Button>
          </>
        }
      >
        <div className="mb-3 max-w-[200px]">
          <Field label="Pass mark (%)">
            <EditableText type="number" value={String(passMark)} onCommit={(v) => setSettings({ passMark: Math.min(100, n(v)) })} />
          </Field>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1">From %</th>
              <th className="p-1">Grade</th>
              <th className="p-1">Points</th>
              <th className="p-1">Remark</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bands.map((b, i) => (
              <tr key={`${b.grade}-${i}`} className="border-t border-line">
                <td className="w-20 p-1">
                  <EditableText type="number" ariaLabel="Lower bound" value={String(b.min)} onCommit={(v) => setB(i, { min: Math.min(100, n(v)) })} />
                </td>
                <td className="w-20 p-1">
                  <EditableText ariaLabel="Grade" value={b.grade} onCommit={(v) => setB(i, { grade: v })} />
                </td>
                <td className="w-20 p-1">
                  <EditableText type="number" ariaLabel="Grade points" value={String(b.points)} onCommit={(v) => setB(i, { points: Number(v) || 0 })} />
                </td>
                <td className="p-1">
                  <EditableText ariaLabel="Remark" value={b.remark} onCommit={(v) => setB(i, { remark: v })} />
                </td>
                <td className="p-1">
                  <Button size="sm" variant="ghost" aria-label="Remove band" icon={<Trash2 className="h-3.5 w-3.5" />} disabled={bands.length < 2} onClick={() => setSettings({ bands: bands.filter((_, j) => j !== i) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Data() {
  const ws = useWorkspace();
  const sync = useSyncStatus();
  const { toast, confirm } = useUi();
  const { busy, run } = useAction();
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [history, setHistory] = useState<SyncMeta[] | null>(null);
  const signedIn = !!getSession();
  useEffect(() => {
    void storageEstimate().then(setUsage);
  }, [ws]);

  const backup = () =>
    run('backup', async () => {
      const payload = JSON.stringify({ app: 'deep-tutor-pro', version: APP_VERSION, exportedAt: new Date().toISOString(), workspace: store.get() });
      const checksum = await sha256(payload);
      const blob = new Blob([JSON.stringify({ checksum, payload })], { type: 'application/json' });
      const res = await saveBlob(blob, `deep-tutor-pro-backup-${new Date().toISOString().slice(0, 10)}.json`);
      if (res.saved) toast(`Backup saved as ${res.name}`);
    });

  const restore = (file: File) =>
    run('restore', async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error('This file is not a Deep Tutor Pro backup.');
      }
      const outer = parsed as { checksum?: string; payload?: string };
      let inner: { app?: string; workspace?: unknown };
      if (outer.payload && outer.checksum) {
        if ((await sha256(outer.payload)) !== outer.checksum) throw new Error('The backup file is damaged (checksum does not match). Nothing was changed.');
        inner = JSON.parse(outer.payload);
      } else inner = parsed as typeof inner;
      if (inner.app !== 'deep-tutor-pro' || !inner.workspace) throw new Error('This file is not a Deep Tutor Pro backup.');
      const incoming = normalizeWorkspace(inner.workspace);
      const replace = await confirm('How should the backup be restored?', {
        ok: 'Replace everything',
        detail: `The backup holds ${incoming.units.length} units, ${incoming.notes.length} notes, ${incoming.papers.length} papers and ${incoming.students.length} students. “Replace everything” makes this device match the backup. Cancel to combine it with what is here instead (nothing is lost).`,
      });
      await replaceWorkspace(replace ? incoming : mergeWorkspaces(store.get(), incoming));
      toast(replace ? 'Backup restored' : 'Backup combined with this device');
      void runSync();
    });

  const loadHistory = () => run('history', async () => setHistory((await cloud.history()).items));
  const restoreVersion = (rev: number) =>
    run(`rev-${rev}`, async () => {
      if (!(await confirm(`Restore cloud version ${rev}?`, { ok: 'Restore', detail: 'This device’s workspace is replaced by that version; it is then synced, so the current cloud copy moves into history.' }))) return;
      const v = await cloud.version(rev);
      await replaceWorkspace(normalizeWorkspace(JSON.parse(v.data)));
      toast(`Version ${rev} restored`);
      void runSync();
    });

  const counts = [
    ['Programmes', ws.programmes.length],
    ['Course units', ws.units.length],
    ['Lecture notes', ws.notes.length],
    ['Library documents', ws.references.length],
    ['Assessments', ws.papers.length],
    ['Bank questions', ws.bank.length],
    ['Students', ws.students.length],
    ['Marks', ws.marks.filter((m) => m.score !== null).length],
  ] as const;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Cloud sync">
        {signedIn ? (
          <>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ws.settings.autoSync} onChange={(e) => setSettings({ autoSync: e.target.checked })} className="h-4 w-4" />
              Sync automatically (a few seconds after each change, and every 5 minutes)
            </label>
            <div className="mb-3 text-sm">
              <span className="text-muted">Status:</span> {sync.message || 'Ready'}
              {sync.lastSynced && <span className="text-muted"> · last synced {new Date(sync.lastSynced).toLocaleString()}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} busy={sync.state === 'syncing'} onClick={() => void runSync()}>
                Sync now
              </Button>
              <Button icon={<CloudDownload className="h-4 w-4" />} busy={busy === 'history'} onClick={() => void loadHistory()}>
                Cloud history
              </Button>
            </div>
            {history && (
              <ul className="mt-3 divide-y divide-line text-sm">
                {history.length === 0 && <li className="py-2 text-muted">No earlier versions yet.</li>}
                {history.map((h) => (
                  <li key={h.rev} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      Version {h.rev} · {h.updated_at ? new Date(h.updated_at).toLocaleString() : '—'} · {h.device || 'unknown device'} · {formatBytes(h.size)}
                    </span>
                    <Button size="sm" busy={busy === `rev-${h.rev}`} onClick={() => void restoreVersion(h.rev)}>
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">Your cloud copy is private to your account. If two devices change things before syncing, you are asked how to combine them — nothing is overwritten silently.</p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Sign in (<a className="text-accent underline underline-offset-2" href="#/settings?tab=account">Account & server</a>) to keep a private cloud copy and use the same workspace on your PC and phone.
          </p>
        )}
      </Card>
      <Card title="Backup file">
        <p className="mb-3 text-sm text-muted">A complete copy of your workspace in one file (with a checksum), to keep on a flash disk or send to another device.</p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download className="h-4 w-4" />} busy={busy === 'backup'} onClick={() => void backup()}>
            Save backup
          </Button>
          <FileButton accept=".json,application/json" icon={<Upload className="h-4 w-4" />} onFiles={(f) => void restore(f[0])} disabled={busy === 'restore'}>
            Restore from file
          </FileButton>
        </div>
      </Card>
      <Card title="On this device" className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {counts.map(([label, n]) => (
            <div key={label} className="rounded-lg bg-panel2 p-2">
              <div className="text-lg font-bold">{n}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
        {usage && (
          <p className="mt-3 text-xs text-muted">
            Storage used: {formatBytes(usage.usage)} of {formatBytes(usage.quota)} available to the app.
          </p>
        )}
      </Card>
    </div>
  );
}
