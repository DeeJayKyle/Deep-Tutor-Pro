import { useSyncExternalStore } from 'react';
import type { Collection, Settings, Workspace } from '../lib/model';
import { COLLECTIONS } from '../lib/model';
import { dbGet, dbSet, requestPersistence } from '../lib/db';
import { emptyWorkspace, migrateLegacy, normalizeWorkspace, now } from '../lib/workspace';
import { ApiError, getSession } from '../lib/api';
import { acceptCloud, mergeWorkspaces, resolveWith, syncNow, type SyncOutcome } from '../lib/sync';

// One workspace store for the whole app. Every change is saved to the device
// at once (debounced) and, when signed in with auto-sync on, uploaded to the
// tutor's cloud copy shortly afterwards.

type Listener = () => void;

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'conflict' | 'offline' | 'signed-out';
  message: string;
  lastSynced: string | null;
  conflict?: Extract<SyncOutcome, { kind: 'conflict' }>;
}

let ws: Workspace = emptyWorkspace();
let loaded = false;
let saveError = '';
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let sync: SyncStatus = { state: 'signed-out', message: '', lastSynced: null };
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const store = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => ws,
  isLoaded: () => loaded,
  saveError: () => saveError,
  sync: () => sync,
};

export async function loadWorkspace(): Promise<void> {
  let saved = await dbGet<unknown>('workspace');
  if (!saved) {
    // First start of 2.x: carry over data from Deep Tutor Pro 1.x (localStorage).
    try {
      saved = migrateLegacy((k) => localStorage.getItem(k)) ?? undefined;
    } catch {
      saved = undefined;
    }
  }
  ws = saved ? normalizeWorkspace(saved) : emptyWorkspace();
  loaded = true;
  // Save pending edits straight away when the app is closed or hidden.
  const flushNow = () => {
    if (saveTimer) void flush();
  };
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('beforeunload', flushNow);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushNow());
  if (saved) await persist();
  void requestPersistence();
  emit();
}

async function persist(): Promise<void> {
  try {
    await dbSet('workspace', ws);
    if (saveError) {
      saveError = '';
      emit();
    }
  } catch (err) {
    saveError = `Changes could not be saved on this device: ${(err as Error).message || err}. Free some storage space, then make any edit to retry.`;
    emit();
  }
}

/**
 * Time-stamp edited items and record deleted ids, so that combining this
 * device's copy with another device's keeps the newest edits and deletions.
 */
export function stampChanges(prev: Workspace, next: Workspace, t = now()): Workspace {
  let out = next;
  let deleted = next.deleted;
  for (const key of COLLECTIONS) {
    const before = prev[key] as unknown as { id: string; updatedAt?: string }[];
    const after = next[key] as unknown as { id: string; updatedAt?: string }[];
    if (before === after) continue;
    const old = new Map(before.map((x) => [x.id, x]));
    const seen = new Set<string>();
    let changed = false;
    const stamped = after.map((item) => {
      seen.add(item.id);
      const was = old.get(item.id);
      if (was && was !== item && item.updatedAt === was.updatedAt) {
        changed = true;
        return { ...item, updatedAt: t };
      }
      return item;
    });
    if (changed) out = { ...out, [key]: stamped };
    for (const id of old.keys()) {
      if (!seen.has(id)) {
        if (deleted === next.deleted) deleted = { ...deleted };
        deleted[id] = t;
      }
    }
  }
  if (deleted !== next.deleted) out = { ...out, deleted };
  if (prev.settings !== next.settings && next.settings.updatedAt === prev.settings.updatedAt) out = { ...out, settings: { ...next.settings, updatedAt: t } };
  return out;
}

/** Apply a change. The updater must return a new object (never mutate). */
export function update(fn: (w: Workspace) => Workspace): void {
  const t = now();
  ws = { ...stampChanges(ws, fn(ws), t), updatedAt: t };
  emit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    void persist();
  }, 300);
  scheduleSync();
}

/** Replace the whole workspace (restore, cloud copy). */
export async function replaceWorkspace(next: Workspace): Promise<void> {
  ws = normalizeWorkspace(next);
  emit();
  await persist();
}

export const flush = async () => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  await persist();
};

// Convenience helpers ------------------------------------------------------

type ItemOf<K extends Collection> = Workspace[K][number];

export function upsert<K extends Collection>(key: K, item: ItemOf<K>): void {
  update((w) => {
    const list = w[key] as unknown as { id: string }[];
    const i = list.findIndex((x) => x.id === (item as { id: string }).id);
    const next = i >= 0 ? list.map((x, j) => (j === i ? item : x)) : [...list, item];
    return { ...w, [key]: next };
  });
}

export function patch<K extends Collection>(key: K, id: string, changes: Partial<ItemOf<K>>): void {
  update((w) => ({
    ...w,
    [key]: (w[key] as unknown as { id: string }[]).map((x) =>
      x.id === id ? { ...x, ...changes, ...('updatedAt' in x ? { updatedAt: now() } : {}) } : x,
    ),
  }));
}

export function remove<K extends Collection>(key: K, ids: string | string[]): void {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  update((w) => ({ ...w, [key]: (w[key] as unknown as { id: string }[]).filter((x) => !set.has(x.id)) }));
}

export function setSettings(changes: Partial<Settings>): void {
  update((w) => ({ ...w, settings: { ...w.settings, ...changes } }));
}

// React hooks --------------------------------------------------------------

export function useWorkspace(): Workspace {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(store.subscribe, store.sync, store.sync);
}

export function useSaveError(): string {
  return useSyncExternalStore(store.subscribe, store.saveError, store.saveError);
}

// Sync ---------------------------------------------------------------------

function setSync(next: Partial<SyncStatus>) {
  sync = { ...sync, ...next };
  emit();
}

export function scheduleSync(delay = 8000): void {
  clearTimeout(syncTimer);
  if (!getSession() || !ws.settings.autoSync) return;
  syncTimer = setTimeout(() => void runSync(), delay);
}

let running: Promise<void> | null = null;
let again = false;

export function runSync(): Promise<void> {
  if (running) {
    // A change arrived during this sync: sync once more when it finishes.
    again = true;
    return running;
  }
  running = (async () => {
    if (!getSession()) {
      setSync({ state: 'signed-out', message: 'Sign in to back up and sync.' });
      return;
    }
    if (sync.state === 'conflict') return;
    setSync({ state: 'syncing', message: 'Syncing…' });
    try {
      await flush();
      const snapshot = ws;
      const result = await syncNow(snapshot);
      const at = new Date().toISOString();
      switch (result.kind) {
        case 'up-to-date':
          setSync({ state: 'idle', message: 'Up to date', lastSynced: at });
          break;
        case 'pushed':
          setSync({ state: 'idle', message: 'Saved to the cloud', lastSynced: at });
          break;
        case 'pulled':
          if (ws === snapshot) {
            await replaceWorkspace(result.ws);
            setSync({ state: 'idle', message: 'Updated from the cloud', lastSynced: at });
          } else {
            // Edits made while the cloud copy was downloading are kept: combine
            // both, then upload the combined copy on the next sync.
            await replaceWorkspace(mergeWorkspaces(ws, result.ws));
            setSync({ state: 'idle', message: 'Updated from the cloud', lastSynced: at });
            scheduleSync(1000);
          }
          break;
        case 'conflict':
          setSync({ state: 'conflict', message: 'Changes on another device need review', conflict: result });
          break;
        case 'offline':
          setSync({ state: 'offline', message: 'Offline — changes are kept on this device' });
          break;
        case 'signed-out':
          setSync({ state: 'signed-out', message: 'Sign in to back up and sync.' });
          break;
      }
    } catch (err) {
      const offline = err instanceof ApiError && err.status === 0;
      setSync({ state: offline ? 'offline' : 'error', message: offline ? 'Offline — will sync when connected' : (err as Error).message });
    } finally {
      running = null;
      if (again) {
        again = false;
        scheduleSync(1000);
      }
    }
  })();
  return running;
}

/** Conflict resolution chosen by the tutor. */
export async function resolveConflict(choice: 'device' | 'cloud' | 'merge'): Promise<void> {
  const c = sync.conflict;
  if (!c) return;
  setSync({ state: 'syncing', message: 'Resolving…', conflict: undefined });
  try {
    if (choice === 'cloud') {
      await replaceWorkspace(c.cloud);
      await acceptCloud(ws, c.cloudRev);
    } else {
      if (choice === 'merge') await replaceWorkspace(mergeWorkspaces(ws, c.cloud));
      const result = await resolveWith(ws, c.cloudRev);
      if (result.kind === 'conflict') {
        setSync({ state: 'conflict', message: 'The cloud changed again — review once more', conflict: result });
        return;
      }
    }
    setSync({ state: 'idle', message: 'Conflict resolved', lastSynced: new Date().toISOString() });
  } catch (err) {
    setSync({ state: 'error', message: (err as Error).message, conflict: c });
  }
}

export function onSessionChanged(): void {
  if (getSession()) void runSync();
  else setSync({ state: 'signed-out', message: 'Sign in to back up and sync.', conflict: undefined });
}
