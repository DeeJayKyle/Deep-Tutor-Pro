// Cloud sync: the workspace is mirrored to the tutor's private copy on the
// DeepTutor server. Each upload names the cloud revision it was based on, so a
// device that missed changes made elsewhere gets a conflict to review instead
// of silently overwriting them.

import type { Workspace } from './model';
import { COLLECTIONS } from './model';
import { ApiError, cloud, deviceName, getSession, isOnline } from './api';
import { dbGet, dbSet } from './db';
import { normalizeWorkspace } from './workspace';

export interface SyncState {
  rev: number; // cloud revision this device last saw
  sha: string; // checksum of the workspace at that moment
  syncedAt: string | null;
}

export type SyncOutcome =
  | { kind: 'up-to-date' }
  | { kind: 'pushed'; rev: number }
  | { kind: 'pulled'; ws: Workspace; rev: number }
  | { kind: 'conflict'; cloud: Workspace; cloudRev: number; cloudDevice: string; cloudUpdatedAt: string | null }
  | { kind: 'offline' }
  | { kind: 'signed-out' };

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Stable serialisation (the timestamp of the last local save is not content). */
export function serialize(ws: Workspace): string {
  const { updatedAt: _ignored, ...content } = ws;
  return JSON.stringify(content);
}

/** Sync progress is kept per server and account: another account's revision means nothing here. */
function syncKey(): string {
  const s = getSession();
  return `sync-state:${s?.server ?? ''}|${s?.username ?? ''}`;
}
export const getSyncState = async (): Promise<SyncState> => (await dbGet<SyncState>(syncKey())) ?? { rev: 0, sha: '', syncedAt: null };
const saveSyncState = (s: SyncState) => dbSet(syncKey(), s);

/** Nothing the tutor made yet: a fresh device that can simply take the cloud copy. */
export function isEmptyWorkspace(ws: Workspace): boolean {
  return COLLECTIONS.every((k) => (k === 'formats' ? ws.formats.every((f) => f.builtIn) : ws[k].length === 0)) && !ws.settings.updatedAt;
}

function parseCloud(data: string | null): Workspace {
  if (!data) return normalizeWorkspace({});
  const raw = JSON.parse(data);
  return normalizeWorkspace({ ...raw, updatedAt: raw.updatedAt ?? new Date().toISOString() });
}

export async function syncNow(ws: Workspace): Promise<SyncOutcome> {
  if (!getSession()) return { kind: 'signed-out' };
  if (!isOnline()) return { kind: 'offline' };
  const state = await getSyncState();
  const data = serialize(ws);
  const sha = await sha256(data);
  const meta = await cloud.meta();
  const localChanged = sha !== state.sha;

  if (meta.rev === state.rev) {
    if (!localChanged) return { kind: 'up-to-date' };
    return push(data, sha, meta.rev);
  }
  // The cloud moved on (another device synced) or this device never synced.
  const remote = await cloud.get();
  const cloudWs = parseCloud(remote.data);
  if (remote.sha256 && remote.sha256 === sha) {
    await saveSyncState({ rev: remote.rev, sha, syncedAt: new Date().toISOString() });
    return { kind: 'up-to-date' };
  }
  if (meta.rev === 0) return push(data, sha, 0);
  if (!localChanged || isEmptyWorkspace(ws)) {
    await saveSyncState({ rev: remote.rev, sha: await sha256(serialize(cloudWs)), syncedAt: new Date().toISOString() });
    return { kind: 'pulled', ws: cloudWs, rev: remote.rev };
  }
  return { kind: 'conflict', cloud: cloudWs, cloudRev: remote.rev, cloudDevice: remote.device, cloudUpdatedAt: remote.updated_at };
}

async function push(data: string, sha: string, baseRev: number, force = false): Promise<SyncOutcome> {
  try {
    const res = await cloud.put({ base_rev: baseRev, device: await deviceName(), sha256: sha, data, force });
    await saveSyncState({ rev: res.rev, sha, syncedAt: new Date().toISOString() });
    return { kind: 'pushed', rev: res.rev };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const d = err.detail as { rev: number; device: string; updated_at: string | null; data: string | null };
      return { kind: 'conflict', cloud: parseCloud(d.data), cloudRev: d.rev, cloudDevice: d.device, cloudUpdatedAt: d.updated_at };
    }
    throw err;
  }
}

/** Resolve a conflict by uploading this workspace over the cloud copy (its previous version stays in history). */
export async function resolveWith(ws: Workspace, cloudRev: number): Promise<SyncOutcome> {
  const data = serialize(ws);
  return push(data, await sha256(data), cloudRev, true);
}

/** Mark the cloud copy as accepted locally (after "use the cloud copy"). */
export async function acceptCloud(ws: Workspace, rev: number): Promise<void> {
  await saveSyncState({ rev, sha: await sha256(serialize(ws)), syncedAt: new Date().toISOString() });
}

const stamp = (item: Record<string, unknown>): string => String(item.updatedAt ?? item.addedAt ?? item.createdAt ?? '');

/**
 * Combine two workspaces item by item: everything from both is kept, where
 * both changed the same item the more recently edited version wins, and items
 * deleted on either side (after their last edit) stay deleted.
 */
export function mergeWorkspaces(local: Workspace, remote: Workspace): Workspace {
  const deleted: Record<string, string> = { ...remote.deleted };
  for (const [id, when] of Object.entries(local.deleted)) if (!deleted[id] || when > deleted[id]) deleted[id] = when;
  const out = { ...local, deleted } as Workspace;
  for (const key of COLLECTIONS) {
    const byId = new Map<string, Record<string, unknown>>();
    for (const item of local[key] as unknown as Record<string, unknown>[]) byId.set(String(item.id), item);
    for (const item of remote[key] as unknown as Record<string, unknown>[]) {
      const mine = byId.get(String(item.id));
      if (!mine || stamp(item) > stamp(mine)) byId.set(String(item.id), item);
    }
    const kept = [...byId.values()].filter((item) => {
      const gone = deleted[String(item.id)];
      return !gone || gone < stamp(item);
    });
    (out as unknown as Record<string, unknown>)[key] = kept;
  }
  // Marks are keyed by student, unit and component: keep one entry per key.
  const marks = new Map<string, Workspace['marks'][number]>();
  for (const m of out.marks) {
    const k = `${m.studentId}|${m.unitId}|${m.componentId}`;
    const prev = marks.get(k);
    if (!prev || m.updatedAt > prev.updatedAt) marks.set(k, m);
  }
  out.marks = [...marks.values()];
  out.settings = (remote.settings.updatedAt ?? '') > (local.settings.updatedAt ?? '') ? remote.settings : local.settings;
  out.updatedAt = new Date().toISOString();
  return out;
}

/** What differs between two workspaces, for the conflict review screen. */
export function diffSummary(local: Workspace, remote: Workspace): { label: string; onlyLocal: number; onlyCloud: number; changed: number }[] {
  const labels: Record<(typeof COLLECTIONS)[number], string> = {
    programmes: 'Programmes',
    classes: 'Classes',
    units: 'Course units',
    notes: 'Lecture notes',
    references: 'Library documents',
    papers: 'Exams & assignments',
    formats: 'Exam formats',
    bank: 'Question bank',
    students: 'Students',
    marks: 'Marks',
    chats: 'Conversations',
  };
  return COLLECTIONS.map((key) => {
    const a = new Map((local[key] as unknown as Record<string, unknown>[]).map((x) => [String(x.id), JSON.stringify(x)]));
    const b = new Map((remote[key] as unknown as Record<string, unknown>[]).map((x) => [String(x.id), JSON.stringify(x)]));
    let onlyLocal = 0;
    let onlyCloud = 0;
    let changed = 0;
    for (const [id, v] of a) {
      if (!b.has(id)) onlyLocal += 1;
      else if (b.get(id) !== v) changed += 1;
    }
    for (const id of b.keys()) if (!a.has(id)) onlyCloud += 1;
    return { label: labels[key], onlyLocal, onlyCloud, changed };
  }).filter((r) => r.onlyLocal || r.onlyCloud || r.changed);
}
