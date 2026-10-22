// Client for the DeepTutor server (https://github.com/DeeJayKyle/DeepTutor).
// The server holds the AI keys; this app never sees them. All work that does
// not need AI or the cloud runs on the device.

import type { Outline, UnitDetail } from './curriculum';
import type { ProviderChoice } from './model';
import type { fromServerQuestion, fromServerSections } from './papers';
import { dbGet, dbSet } from './db';

export const DEFAULT_SERVER = (import.meta.env.VITE_SERVER_URL as string | undefined) || 'https://tutor-companion.djrileykyle.workers.dev';

export interface Session {
  server: string;
  token: string; // empty when signed in through the server's own cookie (web build at /pro/)
  username: string;
  role: string;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

let session: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

/** The web build served at <server>/pro/ talks to its own origin. */
export function sameOriginServer(): string | null {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return null;
  return /\/pro(\/|$)/.test(location.pathname) ? location.origin : null;
}

export async function loadSession(): Promise<Session | null> {
  session = (await dbGet<Session>('session')) ?? null;
  return session;
}

export const getSession = () => session;

export function onSession(fn: (s: Session | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function setSession(s: Session | null) {
  session = s;
  await dbSet('session', s);
  listeners.forEach((fn) => fn(s));
}

export const serverUrl = () => (session?.server || sameOriginServer() || DEFAULT_SERVER).replace(/\/+$/, '');

export const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

function messageFor(status: number, detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && 'message' in detail) return String((detail as { message: unknown }).message);
  if (Array.isArray(detail) && detail[0]?.msg) return `Invalid request: ${detail[0].msg}`;
  if (status === 401) return 'Your sign-in has expired. Sign in again in Settings.';
  if (status === 403) return 'Your account is not allowed to do this.';
  if (status === 404) return 'The server does not support this yet — it may still be updating.';
  if (status === 413) return 'This is too large to send.';
  if (status === 429) return 'The AI service is busy. Wait a minute and try again.';
  if (status === 503) return 'The server is starting up. Try again in a minute.';
  return `The server returned an error (${status}).`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  timeout?: number;
  signal?: AbortSignal;
  auth?: boolean;
}

let inFlight = 0;
/** Number of server requests still waiting for an answer (e.g. an AI reply). */
export const requestsInFlight = () => inFlight;

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  inFlight++;
  try {
    return await send<T>(path, opts);
  } finally {
    inFlight--;
  }
}

async function send<T>(path: string, opts: RequestOptions): Promise<T> {
  if (!isOnline()) throw new ApiError('You are offline. This needs an internet connection; everything else keeps working.', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), opts.timeout ?? 60_000);
  opts.signal?.addEventListener('abort', () => controller.abort(opts.signal?.reason));
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && session?.token) headers.Authorization = `Bearer ${session.token}`;
  let res: Response;
  try {
    res = await fetch(`${serverUrl()}${path}`, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET'),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: controller.signal,
      credentials: sameOriginServer() ? 'same-origin' : 'omit',
    });
  } catch (err) {
    if (opts.signal?.aborted) throw new ApiError('Cancelled.', 0);
    if (controller.signal.aborted) throw new ApiError('The server took too long to answer. Try again; long documents may need a few attempts.', 0);
    throw new ApiError('Could not reach the server. Check the internet connection (the server may also be waking up — try again in a minute).', 0, err);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown })?.detail ?? data;
    throw new ApiError(messageFor(res.status, detail), res.status, detail);
  }
  return data as T;
}

// ---------------------------------------------------------------- account --

export interface ServerStatus {
  api: string;
  user: string;
  role: string;
  providers: { id: 'gemini' | 'openai'; label: string; model: string }[];
  default_provider: string;
  ai_available: boolean;
  youtube_api: boolean;
}

export async function signIn(server: string, username: string, password: string): Promise<Session> {
  return authenticate(server, '/api/tutorpro/auth/login', { username, password });
}

/** Create a tutor account on the server (an ordinary user with a private workspace) and sign in to it. */
export async function createAccount(server: string, username: string, password: string): Promise<Session> {
  try {
    return await authenticate(server, '/api/tutorpro/auth/register', { username, password });
  } catch (err) {
    // A server without sign-up still answers /ping; anything else is the wrong address.
    if (err instanceof ApiError && (err.status === 404 || err.status === 405) && (await isTutorProServer(server)))
      throw new ApiError('This server does not offer sign-up yet. Ask its owner for an account.', err.status, err.detail);
    throw err;
  }
}

async function isTutorProServer(server: string): Promise<boolean> {
  const base = server.trim().replace(/\/+$/, '') || DEFAULT_SERVER;
  try {
    const res = await fetch(`${base}/api/tutorpro/ping`, { credentials: 'omit' });
    return res.ok && ((await res.json()) as { app?: string }).app === 'deep-tutor-pro';
  } catch {
    return false;
  }
}

async function authenticate(server: string, path: string, body: { username: string; password: string }): Promise<Session> {
  const base = server.trim().replace(/\/+$/, '') || DEFAULT_SERVER;
  const prev = session;
  session = { server: base, token: '', username: '', role: '' };
  try {
    const res = await request<{ token: string; username: string; role: string }>(path, { body, auth: false, timeout: 90_000 });
    const s: Session = { server: base, token: res.token, username: res.username, role: res.role };
    await setSession(s);
    return s;
  } catch (err) {
    session = prev;
    throw err;
  }
}

export async function signOut(): Promise<void> {
  await setSession(null);
}

/** Web build at /pro/: the DeepTutor sign-in cookie is enough. */
export async function adoptCookieSession(): Promise<Session | null> {
  const origin = sameOriginServer();
  if (!origin || session?.token) return session;
  try {
    const st = await request<ServerStatus>('/api/tutorpro/status', { timeout: 20_000 });
    const s: Session = { server: origin, token: '', username: st.user, role: st.role };
    await setSession(s);
    return s;
  } catch {
    return session;
  }
}

export const status = () => request<ServerStatus>('/api/tutorpro/status', { timeout: 60_000 });

// --------------------------------------------------------------------- AI --

const AI_TIMEOUT = 330_000;
const ai = <T>(path: string, body: unknown, provider: ProviderChoice, signal?: AbortSignal) =>
  request<T & { model: string }>(`/api/tutorpro${path}`, { body: { ...(body as object), provider }, timeout: AI_TIMEOUT, signal });

export interface SourceText {
  id: string;
  title: string;
  text: string;
}

export interface UnitCtx {
  code: string;
  title: string;
  year: number;
  overview?: string;
  total_hours?: number;
}

export interface TopicCtx {
  title: string;
  hours: number;
  objectives: string[];
  subtopics: string[];
  practicals?: string;
}

export const api = {
  outline: (text: string, titleHint: string, provider: ProviderChoice, signal?: AbortSignal) =>
    ai<Outline & { truncated: boolean }>('/curriculum/outline', { text, title_hint: titleHint }, provider, signal),
  unitDetail: (programme: string, unit: UnitCtx, text: string, provider: ProviderChoice, signal?: AbortSignal) =>
    ai<UnitDetail>('/curriculum/unit', { programme, unit, text }, provider, signal),
  notes: (
    body: { programme: string; unit: UnitCtx; topic: TopicCtx; hour_start: number; sources: SourceText[]; detail: string; audience?: string; instructions?: string },
    provider: ProviderChoice,
    signal?: AbortSignal,
  ) => ai<{ markdown: string }>('/notes', body, provider, signal),
  slides: (title: string, markdown: string, provider: ProviderChoice, maxSlides = 16) => ai<{ markdown: string }>('/slides', { title, markdown, max_slides: maxSlides }, provider),
  examFormat: (text: string, provider: ProviderChoice) =>
    ai<{ name: string; duration: string; instructions: string; style_notes: string; sections: { title: string; type: string; count: number; marks_each: number; choose: number; instructions: string }[] }>(
      '/exam-format',
      { text },
      provider,
    ),
  assessment: (body: unknown, provider: ProviderChoice, signal?: AbortSignal) =>
    ai<{ title: string; instructions: string; duration: string; total_marks: number; sections: Parameters<typeof fromServerSections>[0] }>('/assessment', body, provider, signal),
  questions: (body: unknown, provider: ProviderChoice, signal?: AbortSignal) =>
    ai<{ questions: Parameters<typeof fromServerQuestion>[0][] }>('/questions', body, provider, signal),
  solve: (
    body: { mode: 'solve' | 'tutor' | 'mark'; text: string; history: { role: 'user' | 'assistant'; content: string }[]; images: string[]; documents: SourceText[]; context?: string },
    provider: ProviderChoice,
    signal?: AbortSignal,
  ) => ai<{ answer: string }>('/solve', body, provider, signal),
  transcribe: (audio: string, provider: ProviderChoice) => ai<{ text: string }>('/transcribe', { audio }, provider),
  revise: (instruction: string, content: string, context: string, provider: ProviderChoice) => ai<{ markdown: string }>('/revise', { instruction, content, context }, provider),
};

// ------------------------------------------------------------- research --

export interface ResearchItem {
  title: string;
  url: string;
  source?: string;
  provider?: string;
  authors?: string[];
  year?: string | number;
  date?: string;
  summary?: string;
  thumbnail?: string;
  license?: string;
  channel?: string;
}

export const research = (query: string, kind: 'articles' | 'images' | 'videos', limit = 10) =>
  request<{ results: ResearchItem[]; notes?: string[]; search_url?: string }>('/api/companion/research', { body: { query, kind, limit }, timeout: 60_000 });

export interface StreamEvent {
  type: string;
  content: string;
  stage?: string;
  call_id?: string;
  trace_kind?: string;
  sources?: { title?: string; url?: string; source?: string }[];
  response?: string;
}

/** Run a DeepTutor agent (deep research, tutor chat) and stream its events. */
export async function runAgent(
  payload: { message: string; capability: 'chat' | 'deep_research' | 'deep_solve' | 'deep_question'; knowledge_bases?: string[]; tools?: string[] },
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!isOnline()) throw new ApiError('You are offline. Deep Research needs an internet connection.', 0);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  let res: Response;
  try {
    res = await fetch(`${serverUrl()}/api/companion/deeptutor/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ knowledge_bases: [], tools: [], language: 'en', ...payload }),
      signal,
      credentials: sameOriginServer() ? 'same-origin' : 'omit',
    });
  } catch (err) {
    if (signal?.aborted) return;
    throw new ApiError('Could not reach the server.', 0, err);
  }
  if (!res.ok || !res.body) {
    let detail: unknown = null;
    try {
      detail = (await res.json()).detail;
    } catch {
      /* not JSON */
    }
    throw new ApiError(messageFor(res.status, detail), res.status, detail);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as StreamEvent);
      } catch {
        /* ignore a malformed line */
      }
    }
  }
}

// -------------------------------------------------------- knowledge bases --

export interface KnowledgeBaseInfo {
  name: string;
  status?: string;
  is_default?: boolean;
  statistics?: { raw_documents?: number; documents?: number; files?: number; chunks?: number };
  progress?: { stage?: string; message?: string; percent?: number };
  rag_provider?: string;
}

export const knowledgeBases = {
  list: () => request<KnowledgeBaseInfo[]>('/api/knowledge-bases/list', { timeout: 30_000 }),
  create: (name: string, files: File[]) => {
    const form = new FormData();
    form.append('name', name);
    for (const f of files) form.append('files', f, f.name);
    return request<unknown>('/api/knowledge-bases', { form, timeout: 300_000 });
  },
  upload: (name: string, files: File[]) => {
    const form = new FormData();
    for (const f of files) form.append('files', f, f.name);
    return request<unknown>(`/api/knowledge-bases/${encodeURIComponent(name)}/upload`, { form, timeout: 300_000 });
  },
  remove: (name: string) => request<unknown>(`/api/knowledge-bases/${encodeURIComponent(name)}`, { method: 'DELETE', timeout: 60_000 }),
};

// ------------------------------------------------------------------ sync --

export interface SyncMeta {
  rev: number;
  updated_at: string | null;
  device: string;
  sha256: string;
  size: number;
}

export const cloud = {
  meta: () => request<SyncMeta>('/api/tutorpro/sync/meta', { timeout: 30_000 }),
  get: () => request<SyncMeta & { data: string | null }>('/api/tutorpro/sync', { timeout: 180_000 }),
  put: (body: { base_rev: number; device: string; sha256: string; data: string; force?: boolean }) =>
    request<SyncMeta>('/api/tutorpro/sync', { method: 'PUT', body, timeout: 300_000 }),
  history: () => request<{ items: SyncMeta[] }>('/api/tutorpro/sync/history', { timeout: 30_000 }),
  version: (rev: number) => request<SyncMeta & { data: string }>(`/api/tutorpro/sync/history/${rev}`, { timeout: 180_000 }),
};

export async function deviceName(): Promise<string> {
  let name = await dbGet<string>('device-name');
  if (!name) {
    const ua = navigator.userAgent;
    const kind = /Android/i.test(ua) ? 'Android' : /Windows/i.test(ua) ? 'Windows PC' : /Mac/i.test(ua) ? 'Mac' : /iPhone|iPad/i.test(ua) ? 'iPhone/iPad' : 'Device';
    name = `${kind} ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await dbSet('device-name', name);
  }
  return name;
}
