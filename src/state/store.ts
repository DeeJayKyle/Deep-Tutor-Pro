import { useSyncExternalStore } from 'react';
import type { Collection, Settings, Workspace } from '../lib/model';
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

/** Apply a change. The updater must return a new object (never mutate). */
export function update(fn: (w: Workspace) => Workspace): void {
  ws = { ...fn(ws), updatedAt: now() };
  emit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void persist(), 300);
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

export function runSync(): Promise<void> {
  if (running) return running;
  running = (async () => {
    if (!getSession()) {
      setSync({ state: 'signed-out', message: 'Sign in to back up and sync.' });
      return;
    }
    if (sync.state === 'conflict') return;
    setSync({ state: 'syncing', message: 'Syncing…' });
    try {
      await flush();
      const result = await syncNow(ws);
      const at = new Date().toISOString();
      switch (result.kind) {
        case 'up-to-date':
          setSync({ state: 'idle', message: 'Up to date', lastSynced: at });
          break;
        case 'pushed':
          setSync({ state: 'idle', message: 'Saved to the cloud', lastSynced: at });
          break;
        case 'pulled':
          await replaceWorkspace(result.ws);
          setSync({ state: 'idle', message: 'Updated from the cloud', lastSynced: at });
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
