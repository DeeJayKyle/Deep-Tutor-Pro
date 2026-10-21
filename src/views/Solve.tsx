import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Camera, Copy, FileText, ImagePlus, Loader2, MessageSquarePlus, Mic, Paperclip, Send, Square, Trash2, X } from 'lucide-react';
import type { Chat, ChatMessage } from '../lib/model';
import { api, type SourceText } from '../lib/api';
import { ACCEPT, extractFile, imageToDataUrl, isImage } from '../lib/extract';
import { startRecording, toWavBase64, type Recorder } from '../lib/audio';
import { sortUnits } from '../lib/curriculum';
import { now, uid, unitLabel } from '../lib/workspace';
import { navigate, useRoute } from '../state/router';
import { remove, update, upsert, useWorkspace } from '../state/store';
import { aiProvider, formatDate, programmeTitle } from '../state/helpers';
import { Markdown } from '../ui/Markdown';
import { Button, FileButton, Select, Textarea, cx, useUi } from '../ui/kit';

type Mode = 'solve' | 'tutor' | 'mark';
const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'solve', label: 'Solve', hint: 'Step-by-step solutions to questions, problems, tasks and assignments' },
  { id: 'tutor', label: 'Explain', hint: 'Explain a concept clearly, with examples' },
  { id: 'mark', label: 'Mark a script', hint: 'Mark a student’s answer against the question / marking scheme' },
];

interface Pending {
  images: { name: string; dataUrl: string }[];
  documents: (SourceText & { name: string })[];
  voice: string[];
}

const EMPTY: Pending = { images: [], documents: [], voice: [] };

export default function SolveView() {
  const ws = useWorkspace();
  const route = useRoute();
  const { toast, confirm } = useUi();
  const chats = ws.chats.filter((c) => c.kind === 'solve').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const chatId = route.parts[1];
  const chat = chats.find((c) => c.id === chatId);
  const [mode, setMode] = useState<Mode>((route.query.get('mode') as Mode) || 'solve');
  const [unitId, setUnitId] = useState(route.query.get('unit') ?? chat?.unitId ?? '');
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending>(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [recorder, setRecorder] = useState<Recorder | null>(null);
  const [seconds, setSeconds] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const unit = ws.units.find((u) => u.id === unitId);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [chat?.messages.length, busy]);
  useEffect(() => {
    if (!recorder) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recorder]);

  const addFiles = async (files: File[]) => {
    setBusy('reading');
    try {
      for (const f of files) {
        if (isImage(f)) {
          const dataUrl = await imageToDataUrl(f);
          setPending((p) => ({ ...p, images: [...p.images, { name: f.name || 'photo.jpg', dataUrl }].slice(0, 6) }));
        } else {
          const ex = await extractFile(f);
          if (!ex.text.trim()) throw new Error(`No text could be read from ${f.name}.`);
          setPending((p) => ({ ...p, documents: [...p.documents, { id: uid('d'), name: f.name, title: f.name, text: ex.text.slice(0, 60_000) }] }));
        }
      }
    } catch (err) {
      toast((err as Error).message, 'bad');
    } finally {
      setBusy(null);
    }
  };

  const toggleVoice = async () => {
    if (recorder) {
      const r = recorder;
      setRecorder(null);
      setBusy('transcribing');
      try {
        const blob = await r.stop();
        const { base64 } = await toWavBase64(blob);
        const res = await api.transcribe(base64, aiProvider());
        if (!res.text.trim()) throw new Error('Nothing was heard in the recording.');
        setText((t) => (t ? `${t}\n${res.text}` : res.text));
        setPending((p) => ({ ...p, voice: [...p.voice, `Voice note (${seconds}s)`] }));
      } catch (err) {
        toast((err as Error).message, 'bad');
      } finally {
        setBusy(null);
      }
      return;
    }
    try {
      aiProvider();
      setRecorder(await startRecording());
    } catch (err) {
      toast((err as Error).message || 'Microphone access was refused.', 'bad');
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body && !pending.images.length && !pending.documents.length) return;
    let provider;
    try {
      provider = aiProvider();
    } catch (err) {
      toast((err as Error).message, 'bad');
      return;
    }
    const t = now();
    const userMsg: ChatMessage = {
      id: uid('msg-'),
      role: 'user',
      content: body || (pending.images.length ? 'Solve the question(s) in the attached image(s).' : 'See the attached document.'),
      attachments: [...pending.images.map((i) => ({ kind: 'image' as const, name: i.name })), ...pending.documents.map((d) => ({ kind: 'document' as const, name: d.name })), ...pending.voice.map((v) => ({ kind: 'voice' as const, name: v }))],
      createdAt: t,
    };
    let current: Chat = chat ?? { id: uid('ch-'), kind: 'solve', title: (body || pending.images[0]?.name || pending.documents[0]?.name || 'New question').slice(0, 80), unitId: unitId || undefined, messages: [], createdAt: t, updatedAt: t };
    const history = current.messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    current = { ...current, messages: [...current.messages, userMsg], updatedAt: t };
    upsert('chats', current);
    if (!chat) navigate(`/solve/${current.id}`, undefined, true);
    const sent = pending;
    setText('');
    setPending(EMPTY);
    setBusy('answering');
    abort.current = new AbortController();
    const context = unit ? `${programmeTitle(ws, unit)} — ${unitLabel(unit)} (Year ${unit.year})` : '';
    let reply: ChatMessage;
    try {
      const res = await api.solve({ mode, text: body, history, images: sent.images.map((i) => i.dataUrl), documents: sent.documents.map(({ id, title, text: tx }) => ({ id, title, text: tx })), context }, provider, abort.current.signal);
      reply = { id: uid('msg-'), role: 'assistant', content: res.answer, attachments: [], model: res.model, createdAt: now() };
    } catch (err) {
      reply = { id: uid('msg-'), role: 'assistant', content: (err as Error).message, attachments: [], error: true, createdAt: now() };
      // Keep the attachments so the tutor can resend.
      if (!abort.current.signal.aborted) setPending(sent);
    }
    const id = current.id;
    update((w) => ({ ...w, chats: w.chats.map((c) => (c.id === id ? { ...c, messages: [...c.messages, reply], updatedAt: now() } : c)) }));
    setBusy(null);
  };

  const saveAsNote = (m: ChatMessage) => {
    if (!unit) {
      toast('Choose a course unit (top of the chat) to save this as notes.', 'info');
      return;
    }
    const t = now();
    const note = { id: uid('n-'), unitId: unit.id, title: (chat?.title ?? 'Deep Solve answer').slice(0, 100), markdown: m.content, hourStart: 1, hourEnd: 1, status: 'draft' as const, sourceIds: [], model: m.model ?? '', createdAt: t, updatedAt: t };
    upsert('notes', note);
    toast('Saved to lecture notes');
    navigate(`/notes/${note.id}`);
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-panel md:flex">
        <div className="p-3">
          <Button className="w-full" variant="primary" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => navigate('/solve', unitId ? { unit: unitId } : undefined)}>
            New question
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-3">
          {chats.map((c) => (
            <li key={c.id} className="group flex items-center">
              <a href={`#/solve/${c.id}`} className={cx('min-w-0 flex-1 rounded-lg px-3 py-2 text-sm', c.id === chatId ? 'bg-accent/15 text-accent' : 'hover:bg-panel2')}>
                <div className="truncate">{c.title}</div>
                <div className="text-[10px] text-muted">{formatDate(c.updatedAt)}</div>
              </a>
              <button
                aria-label={`Delete ${c.title}`}
                className="hidden p-1 text-muted hover:text-bad group-hover:block"
                onClick={async () => {
                  if (await confirm('Delete this conversation?', { danger: true, ok: 'Delete' })) {
                    remove('chats', c.id);
                    if (c.id === chatId) navigate('/solve');
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
          <BrainCircuit className="h-5 w-5 text-accent" />
          <h1 className="font-semibold">Deep Solve</h1>
          <div className="flex rounded-lg border border-line p-0.5">
            {MODES.map((m) => (
              <button key={m.id} title={m.hint} onClick={() => setMode(m.id)} className={cx('rounded-md px-2.5 py-1 text-xs', mode === m.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink')}>
                {m.label}
              </button>
            ))}
          </div>
          <Select aria-label="Course unit context" className="ml-auto w-auto max-w-[45vw] py-1 text-xs" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">No course unit</option>
            {sortUnits(ws.units).map((u) => (
              <option key={u.id} value={u.id}>
                {unitLabel(u)}
              </option>
            ))}
          </Select>
          <Button size="sm" className="md:hidden" onClick={() => navigate('/solve')} icon={<MessageSquarePlus className="h-4 w-4" />} aria-label="New question" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!chat?.messages.length ? (
            <div className="mx-auto mt-8 max-w-xl text-center">
              <BrainCircuit className="mx-auto mb-3 h-10 w-10 text-accent" />
              <h2 className="text-lg font-semibold">Ask anything — or show it</h2>
              <p className="mt-1 text-sm text-muted">Type a question, take a photo of an exam question or worksheet, attach a document or assignment, or record a voice note. Deep Solve works through it step by step.</p>
              <div className="mt-4 grid gap-2 text-left text-sm sm:grid-cols-2">
                {['Calculate the dose of amoxicillin suspension (125 mg/5 mL) for a 14 kg child at 25 mg/kg/day in 3 divided doses', 'Explain first-pass metabolism with an example', 'Compare tablets and capsules as dosage forms in a table', 'Write a model answer: describe the management of an anaphylactic reaction'].map((s) => (
                  <button key={s} onClick={() => setText(s)} className="rounded-lg border border-line p-3 text-left text-muted hover:border-accent hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {chat.messages.map((m) => (
                <div key={m.id} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cx('max-w-[92%] rounded-2xl px-4 py-3', m.role === 'user' ? 'bg-accent text-accent-ink' : m.error ? 'border border-bad/40 bg-bad/10' : 'border border-line bg-panel')}>
                    {m.role === 'user' ? <div className="whitespace-pre-wrap text-sm">{m.content}</div> : <Markdown source={m.content} />}
                    {m.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.attachments.map((a, i) => (
                          <span key={i} className="rounded bg-black/15 px-1.5 py-0.5 text-[11px]">
                            {a.kind === 'image' ? '🖼' : a.kind === 'voice' ? '🎙' : '📄'} {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.role === 'assistant' && !m.error && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2 text-[11px] text-muted">
                        {m.model && <span>{m.model}</span>}
                        <button className="flex items-center gap-1 hover:text-ink" onClick={() => void navigator.clipboard?.writeText(m.content).then(() => toast('Copied'))}>
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                        <button className="flex items-center gap-1 hover:text-ink" onClick={() => saveAsNote(m)}>
                          <FileText className="h-3 w-3" /> Save as notes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy === 'answering' && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Working through it step by step…
                  <Button size="sm" variant="ghost" onClick={() => abort.current?.abort()}>
                    Stop
                  </Button>
                </div>
              )}
              <div ref={bottom} />
            </div>
          )}
        </div>

        <div className="border-t border-line bg-panel px-3 py-3">
          <div className="mx-auto max-w-3xl">
            {(pending.images.length > 0 || pending.documents.length > 0) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pending.images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.dataUrl} alt={img.name} className="h-16 w-16 rounded-lg border border-line object-cover" />
                    <button aria-label={`Remove ${img.name}`} className="absolute -right-1.5 -top-1.5 rounded-full bg-panel p-0.5 shadow" onClick={() => setPending((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {pending.documents.map((d, i) => (
                  <span key={d.id} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs">
                    <FileText className="h-3.5 w-3.5" /> {d.name}
                    <button aria-label={`Remove ${d.name}`} onClick={() => setPending((p) => ({ ...p, documents: p.documents.filter((_, j) => j !== i) }))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex shrink-0 gap-1">
                <FileButton accept="image/*" capture="environment" variant="ghost" icon={<Camera className="h-4 w-4" />} onFiles={(f) => void addFiles(f)} disabled={!!busy}>
                  <span className="sr-only">Take a photo</span>
                </FileButton>
                <FileButton accept={`${ACCEPT}`} multiple variant="ghost" icon={<Paperclip className="h-4 w-4" />} onFiles={(f) => void addFiles(f)} disabled={!!busy}>
                  <span className="sr-only">Attach images or documents</span>
                </FileButton>
              </div>
              <Textarea
                aria-label="Your question"
                rows={2}
                className="min-h-[44px] flex-1"
                placeholder={recorder ? `Recording… ${seconds}s — tap the microphone to finish` : MODES.find((m) => m.id === mode)!.hint}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button variant={recorder ? 'danger' : 'ghost'} aria-label={recorder ? 'Stop recording' : 'Record a voice note'} icon={recorder ? <Square className="h-4 w-4" /> : busy === 'transcribing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} onClick={() => void toggleVoice()} disabled={busy === 'transcribing'} />
              <Button variant="primary" aria-label="Send" icon={<Send className="h-4 w-4" />} disabled={!!busy || !!recorder || (!text.trim() && !pending.images.length && !pending.documents.length)} onClick={() => void send()} />
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
              <ImagePlus className="h-3 w-3" /> Photos, PDFs, Word, slides and voice notes are read on your device first; answers need an internet connection.
              {busy === 'reading' && <span className="ml-2">Reading attachment…</span>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
