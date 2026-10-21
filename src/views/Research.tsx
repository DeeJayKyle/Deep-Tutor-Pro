import { useEffect, useRef, useState } from 'react';
import { BookMarked, ExternalLink, FileText, Image as ImageIcon, Loader2, MessageSquarePlus, Search, Send, Telescope, Trash2, Video } from 'lucide-react';
import type { Chat, ChatMessage } from '../lib/model';
import { knowledgeBases, research, runAgent, type KnowledgeBaseInfo, type ResearchItem, type StreamEvent } from '../lib/api';
import { assemble, sourcesOf, stageOf } from '../lib/stream';
import { sortUnits } from '../lib/curriculum';
import { now, uid, unitLabel } from '../lib/workspace';
import { navigate, useRoute } from '../state/router';
import { remove, update, upsert, useWorkspace } from '../state/store';
import { aiProvider, formatDate } from '../state/helpers';
import { Markdown } from '../ui/Markdown';
import { Badge, Button, Card, Checkbox, Empty, Input, Page, Select, Tabs, Textarea, cx, useAction, useUi } from '../ui/kit';

type Tab = 'chat' | 'research' | 'find';

export default function ResearchView() {
  const route = useRoute();
  const tab = (route.parts[1] as Tab) || 'chat';
  return (
    <Page title="Tutor chat & research" subtitle="DeepTutor’s agents: a tutor that can search the web and your knowledge bases, multi-step Deep Research with sources, and real articles, images and videos for your lessons.">
      <Tabs<Tab>
        value={tab}
        onChange={(t) => navigate(`/research/${t}`)}
        tabs={[
          { id: 'chat', label: 'Tutor chat' },
          { id: 'research', label: 'Deep Research' },
          { id: 'find', label: 'Find articles, images & videos' },
        ]}
      />
      {tab === 'find' ? <Finder /> : <AgentChat kind={tab === 'research' ? 'research' : 'tutor'} />}
    </Page>
  );
}

function AgentChat({ kind }: { kind: 'tutor' | 'research' }) {
  const ws = useWorkspace();
  const route = useRoute();
  const { toast, confirm } = useUi();
  const chats = ws.chats.filter((c) => c.kind === kind).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const chatId = route.query.get('chat') ?? '';
  const chat = chats.find((c) => c.id === chatId);
  const [text, setText] = useState('');
  const [events, setEvents] = useState<StreamEvent[] | null>(null);
  const [kbs, setKbs] = useState<KnowledgeBaseInfo[]>([]);
  const [chosenKbs, setChosenKbs] = useState<string[]>([]);
  const [web, setWeb] = useState(true);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const base = `/research/${kind === 'research' ? 'research' : 'chat'}`;

  useEffect(() => {
    knowledgeBases
      .list()
      .then(setKbs)
      .catch(() => setKbs([]));
  }, []);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [chat?.messages.length, events?.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    try {
      aiProvider();
    } catch (err) {
      toast((err as Error).message, 'bad');
      return;
    }
    const t = now();
    const userMsg: ChatMessage = { id: uid('msg-'), role: 'user', content: body, attachments: [], createdAt: t };
    let current: Chat = chat ?? { id: uid('ch-'), kind, title: body.slice(0, 80), messages: [], createdAt: t, updatedAt: t };
    const history = current.messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Tutor' : 'Assistant'}: ${m.content.slice(0, 2000)}`)
      .join('\n\n');
    current = { ...current, messages: [...current.messages, userMsg], updatedAt: t };
    upsert('chats', current);
    if (!chat) navigate(base, { chat: current.id }, true);
    setText('');
    const collected: StreamEvent[] = [];
    setEvents([]);
    abort.current = new AbortController();
    let reply: ChatMessage;
    try {
      await runAgent(
        {
          message: history ? `Conversation so far:\n${history}\n\nTutor: ${body}` : body,
          capability: kind === 'research' ? 'deep_research' : 'chat',
          knowledge_bases: chosenKbs,
          tools: kind === 'tutor' && web ? ['web_search'] : [],
        },
        (e) => {
          collected.push(e);
          setEvents([...collected]);
        },
        abort.current.signal,
      );
      const err = collected.find((e) => e.type === 'error');
      const answer = assemble(collected);
      reply = err && !answer
        ? { id: uid('msg-'), role: 'assistant', content: err.content || 'DeepTutor reported an error.', attachments: [], error: true, createdAt: now() }
        : { id: uid('msg-'), role: 'assistant', content: answer || '_No answer was produced._', attachments: [], sources: sourcesOf(collected), model: kind === 'research' ? 'DeepTutor Deep Research' : 'DeepTutor tutor', createdAt: now() };
    } catch (err) {
      reply = { id: uid('msg-'), role: 'assistant', content: (err as Error).message, attachments: [], error: true, createdAt: now() };
    }
    const id = current.id;
    update((w) => ({ ...w, chats: w.chats.map((c) => (c.id === id ? { ...c, messages: [...c.messages, reply], updatedAt: now() } : c)) }));
    setEvents(null);
  };

  const live = events ? assemble(events) : '';
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3">
        <Button className="w-full" variant="primary" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => navigate(base)}>
          New {kind === 'research' ? 'research' : 'chat'}
        </Button>
        <ul className="max-h-[50vh] space-y-0.5 overflow-y-auto">
          {chats.map((c) => (
            <li key={c.id} className="group flex items-center">
              <a href={`#${base}?chat=${c.id}`} className={cx('min-w-0 flex-1 rounded-lg px-3 py-1.5 text-sm', c.id === chatId ? 'bg-accent/15 text-accent' : 'hover:bg-panel2')}>
                <div className="truncate">{c.title}</div>
                <div className="text-[10px] text-muted">{formatDate(c.updatedAt)}</div>
              </a>
              <button aria-label={`Delete ${c.title}`} className="hidden p-1 text-muted hover:text-bad group-hover:block" onClick={async () => (await confirm('Delete this conversation?', { danger: true, ok: 'Delete' })) && remove('chats', c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <Card title="Use these sources">
          {kind === 'tutor' && <Checkbox checked={web} onChange={setWeb} label={<span className="text-xs">Web search</span>} />}
          <div className="mt-2 text-xs text-muted">Knowledge bases</div>
          {kbs.length === 0 ? (
            <p className="text-xs text-muted">
              None. <a href="#/knowledge" className="text-accent">Create one</a> from your library.
            </p>
          ) : (
            kbs.map((k) => <Checkbox key={k.name} checked={chosenKbs.includes(k.name)} onChange={(v) => setChosenKbs(v ? [...chosenKbs, k.name] : chosenKbs.filter((x) => x !== k.name))} label={<span className="text-xs">{k.name}</span>} />)
          )}
        </Card>
      </aside>
      <div className="flex min-h-[60vh] flex-col rounded-xl border border-line bg-panel">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!chat?.messages.length && !events ? (
            <Empty icon={kind === 'research' ? <Telescope className="h-8 w-8" /> : <BookMarked className="h-8 w-8" />} title={kind === 'research' ? 'Research a topic in depth' : 'Talk to your AI teaching assistant'}>
              {kind === 'research'
                ? 'Deep Research plans the question, searches several sources, and writes a referenced report you can save as lecture notes. It takes a few minutes.'
                : 'Ask for explanations, lesson ideas, mnemonics, case scenarios or teaching strategies. It can search the web and your knowledge bases.'}
            </Empty>
          ) : (
            chat?.messages.map((m) => <Bubble key={m.id} m={m} />)
          )}
          {events && (
            <div className="rounded-2xl border border-line px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stageOf(events) || 'Thinking…'}
                <Button size="sm" variant="ghost" onClick={() => abort.current?.abort()}>
                  Stop
                </Button>
              </div>
              {live && <Markdown source={live} />}
            </div>
          )}
          <div ref={bottom} />
        </div>
        <div className="flex items-end gap-2 border-t border-line p-3">
          <Textarea
            aria-label="Message"
            rows={2}
            className="flex-1"
            value={text}
            placeholder={kind === 'research' ? 'e.g. Current evidence on antimicrobial resistance in East Africa for a pharmacy lecture' : 'Ask your teaching assistant…'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button variant="primary" aria-label="Send" icon={<Send className="h-4 w-4" />} disabled={!!events || !text.trim()} onClick={() => void send()} />
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const ws = useWorkspace();
  const { toast } = useUi();
  const [unitId, setUnitId] = useState('');
  if (m.role === 'user')
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl bg-accent px-4 py-2.5 text-sm text-accent-ink">{m.content}</div>
      </div>
    );
  const save = () => {
    const t = now();
    const md = `${m.content}${m.sources?.length ? `\n\n## Sources\n${m.sources.map((s) => `- ${s.url ? `[${s.title}](${s.url})` : s.title}`).join('\n')}` : ''}`;
    const note = { id: uid('n-'), unitId, title: m.content.match(/^#\s+(.+)$/m)?.[1]?.slice(0, 100) ?? 'Research notes', markdown: md, hourStart: 1, hourEnd: 1, status: 'draft' as const, sourceIds: [], model: m.model ?? '', createdAt: t, updatedAt: t };
    upsert('notes', note);
    toast('Saved as lecture notes');
    navigate(`/notes/${note.id}`);
  };
  return (
    <div className={cx('rounded-2xl border px-4 py-3', m.error ? 'border-bad/40 bg-bad/10' : 'border-line')}>
      <Markdown source={m.content} />
      {m.sources && m.sources.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-muted">Sources ({m.sources.length})</summary>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {m.sources.map((s, i) => (
              <li key={i}>
                {s.url ? (
                  <a className="text-accent" href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {!m.error && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
          <Select aria-label="Save to course unit" className="w-auto py-1 text-xs" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">No course unit</option>
            {sortUnits(ws.units).map((u) => (
              <option key={u.id} value={u.id}>
                {unitLabel(u)}
              </option>
            ))}
          </Select>
          <Button size="sm" icon={<FileText className="h-3.5 w-3.5" />} onClick={save}>
            Save as lecture notes
          </Button>
        </div>
      )}
    </div>
  );
}

function Finder() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'articles' | 'images' | 'videos'>('articles');
  const [results, setResults] = useState<ResearchItem[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const { busy, run } = useAction();
  const search = () =>
    run('search', async () => {
      aiProvider();
      const res = await research(q.trim(), kind, 12);
      setResults(res.results);
      setWarnings([...(res.notes ?? []), ...(res.search_url ? [`Search YouTube directly: ${res.search_url}`] : [])]);
    });
  return (
    <div>
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 2) void search();
        }}
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. pharmacokinetics of paracetamol" aria-label="Search" />
        </div>
        <div className="flex rounded-lg border border-line p-0.5">
          {(
            [
              ['articles', FileText, 'Articles'],
              ['images', ImageIcon, 'Images'],
              ['videos', Video, 'Videos'],
            ] as const
          ).map(([k, Icon, label]) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={cx('flex items-center gap-1 rounded-md px-3 py-1.5 text-xs', kind === k ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink')}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <Button type="submit" variant="primary" busy={busy === 'search'} disabled={q.trim().length < 2}>
          Search
        </Button>
      </form>
      <p className="mb-3 text-xs text-muted">Results come from real indexes (OpenAlex, arXiv, Wikimedia Commons, YouTube) with links to the original — nothing here is written by AI.</p>
      {warnings.map((w) => (
        <p key={w} className="mb-2 text-xs text-warn">
          {w}
        </p>
      ))}
      {results &&
        (results.length === 0 ? (
          <Empty title="Nothing found">Try different words.</Empty>
        ) : (
          <div className={cx('grid gap-3', kind === 'articles' ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
            {results.map((r, i) => (
              <Card key={i} className="flex flex-col">
                {r.thumbnail && <img src={r.thumbnail} alt="" loading="lazy" className="mb-2 aspect-video w-full rounded-lg object-cover" />}
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">
                  {r.title} <ExternalLink className="inline h-3 w-3" />
                </a>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted">
                  {r.provider && <Badge>{r.provider}</Badge>}
                  {(r.year || r.date) && <span>{String(r.year ?? r.date).slice(0, 10)}</span>}
                  {r.authors?.length ? <span className="truncate">{r.authors.slice(0, 3).join(', ')}</span> : null}
                  {r.channel && <span>{r.channel}</span>}
                  {r.license && <span>{r.license}</span>}
                </div>
                {r.summary && <p className="mt-2 line-clamp-4 text-xs text-muted">{r.summary}</p>}
              </Card>
            ))}
          </div>
        ))}
    </div>
  );
}
