import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

const store = new Map<string, unknown>();
vi.mock('../src/lib/db', () => ({
  dbGet: vi.fn(async (k: string) => store.get(k)),
  dbSet: vi.fn(async (k: string, v: unknown) => {
    store.set(k, v);
  }),
}));

const apiState = vi.hoisted(() => ({ session: { server: 's', token: 't', username: 'u', role: 'tutor' } as unknown, online: true }));
vi.mock('../src/lib/api', () => {
  class ApiError extends Error {
    status: number;
    detail: unknown;
    constructor(message: string, status: number, detail?: unknown) {
      super(message);
      this.status = status;
      this.detail = detail;
    }
  }
  return {
    ApiError,
    getSession: () => apiState.session,
    isOnline: () => apiState.online,
    deviceName: async () => 'Test device',
    cloud: { meta: vi.fn(), get: vi.fn(), put: vi.fn() },
  };
});

import { cloud, ApiError } from '../src/lib/api';
import { acceptCloud, diffSummary, getSyncState, isEmptyWorkspace, mergeWorkspaces, resolveWith, serialize, sha256, syncNow } from '../src/lib/sync';
import { normalizeWorkspace } from '../src/lib/workspace';
import type { Workspace } from '../src/lib/model';

if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto);

const meta = cloud.meta as unknown as ReturnType<typeof vi.fn>;
const get = cloud.get as unknown as ReturnType<typeof vi.fn>;
const put = cloud.put as unknown as ReturnType<typeof vi.fn>;

const D1 = '2026-01-01T00:00:00.000Z';
const D2 = '2026-02-01T00:00:00.000Z';

function ws(extra: Record<string, unknown> = {}): Workspace {
  return normalizeWorkspace({ updatedAt: D1, settings: { academicYear: '2026/2027' }, ...extra });
}
const student = (id: string, firstName: string, updatedAt = D1) => ({ id, firstName, lastName: 'X', createdAt: D1, updatedAt });
const mark = (id: string, componentId: string, score: number, updatedAt: string) => ({ id, studentId: 's1', unitId: 'u1', componentId, score, updatedAt });

beforeEach(() => {
  store.clear();
  meta.mockReset();
  get.mockReset();
  put.mockReset();
  apiState.session = { server: 's', token: 't', username: 'u', role: 'tutor' };
  apiState.online = true;
});

describe('serialize / sha256', () => {
  it('ignores the save timestamp', async () => {
    const a = ws();
    const b = { ...a, updatedAt: D2 };
    expect(serialize(a)).toBe(serialize(b));
    expect(await sha256(serialize(a))).toBe(await sha256(serialize(b)));
    expect(await sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('isEmptyWorkspace', () => {
    expect(isEmptyWorkspace(ws())).toBe(true);
    expect(isEmptyWorkspace(ws({ students: [student('s1', 'A')] }))).toBe(false);
  });
});

describe('mergeWorkspaces', () => {
  it('keeps items from both sides and lets the newer edit win', () => {
    const local = ws({ students: [student('a', 'Local A', D2), student('b', 'Only local')], updatedAt: D2, settings: { institution: 'Local school' } });
    const remote = ws({ students: [student('a', 'Remote A', D1), student('c', 'Only remote')], units: [{ id: 'u9', title: 'Remote unit', updatedAt: D1, createdAt: D1 }], settings: { institution: 'Remote school' } });
    const merged = mergeWorkspaces(local, remote);
    const names = Object.fromEntries(merged.students.map((s) => [s.id, s.firstName]));
    expect(names).toEqual({ a: 'Local A', b: 'Only local', c: 'Only remote' });
    expect(merged.units.map((u) => u.id)).toEqual(['u9']);
    expect(merged.settings.institution).toBe('Local school');
    // remote edit newer than local wins
    const merged2 = mergeWorkspaces(ws({ students: [student('a', 'Old', D1)] }), ws({ students: [student('a', 'New', D2)] }));
    expect(merged2.students[0].firstName).toBe('New');
    // built-in formats are not duplicated
    expect(merged.formats.filter((f) => f.id === 'fmt-standard')).toHaveLength(1);
    // inputs untouched
    expect(local.students.map((s) => s.firstName)).toEqual(['Local A', 'Only local']);
  });

  it('uses addedAt/createdAt stamps for items without updatedAt', () => {
    const merged = mergeWorkspaces(
      ws({ references: [{ id: 'r', name: 'old', addedAt: D1 }], classes: [{ id: 'c', name: 'old', createdAt: D1 }] }),
      ws({ references: [{ id: 'r', name: 'new', addedAt: D2 }], classes: [{ id: 'c', name: 'new', createdAt: D2 }] }),
    );
    expect(merged.references[0].name).toBe('new');
    expect(merged.classes[0].name).toBe('new');
  });

  it('dedupes marks by student, unit and component keeping the latest', () => {
    const merged = mergeWorkspaces(
      ws({ marks: [mark('m-local', 'cat1', 40, D1), mark('m-exam', 'exam', 70, D1)] }),
      ws({ marks: [mark('m-remote', 'cat1', 55, D2), mark('m-cat2', 'cat2', 60, D1)] }),
    );
    const byComp = Object.fromEntries(merged.marks.map((m) => [m.componentId, [m.id, m.score]]));
    expect(byComp).toEqual({ cat1: ['m-remote', 55], exam: ['m-exam', 70], cat2: ['m-cat2', 60] });
    expect(merged.marks).toHaveLength(3);
  });

  it('takes remote settings when the remote copy is newer', () => {
    const merged = mergeWorkspaces(ws({ settings: { institution: 'L' } }), ws({ updatedAt: D2, settings: { institution: 'R' } }));
    expect(merged.settings.institution).toBe('R');
  });
});

describe('diffSummary', () => {
  it('counts items only on one side and changed items', () => {
    const local = ws({ students: [student('a', 'A'), student('b', 'B')], units: [{ id: 'u', title: 'U', createdAt: D1, updatedAt: D1 }] });
    const remote = ws({ students: [student('a', 'A changed'), student('c', 'C')], units: [{ id: 'u', title: 'U', createdAt: D1, updatedAt: D1 }] });
    expect(diffSummary(local, remote)).toEqual([{ label: 'Students', onlyLocal: 1, onlyCloud: 1, changed: 1 }]);
    expect(diffSummary(local, local)).toEqual([]);
  });
});

describe('syncNow', () => {
  const local = ws({ students: [student('s1', 'Jane')] });
  const metaOf = (rev: number, sha = '') => ({ rev, updated_at: D2, device: 'Other PC', sha256: sha, size: 1 });

  it('returns signed-out and offline without calling the server', async () => {
    apiState.session = null;
    expect(await syncNow(local)).toEqual({ kind: 'signed-out' });
    apiState.session = { token: 't' };
    apiState.online = false;
    expect(await syncNow(local)).toEqual({ kind: 'offline' });
    expect(meta).not.toHaveBeenCalled();
  });

  it('is up to date when neither side changed', async () => {
    const sha = await sha256(serialize(local));
    store.set('sync-state', { rev: 5, sha, syncedAt: D1 });
    meta.mockResolvedValue(metaOf(5, sha));
    expect(await syncNow({ ...local, updatedAt: D2 })).toEqual({ kind: 'up-to-date' });
    expect(put).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('pushes local changes on top of the revision it last saw', async () => {
    store.set('sync-state', { rev: 5, sha: 'old', syncedAt: D1 });
    meta.mockResolvedValue(metaOf(5));
    put.mockResolvedValue(metaOf(6));
    const out = await syncNow(local);
    expect(out).toEqual({ kind: 'pushed', rev: 6 });
    const body = put.mock.calls[0][0];
    expect(body).toMatchObject({ base_rev: 5, device: 'Test device', force: false });
    expect(body.sha256).toBe(await sha256(body.data));
    expect(JSON.parse(body.data).students[0].firstName).toBe('Jane');
    expect(await getSyncState()).toMatchObject({ rev: 6, sha: body.sha256 });
  });

  it('pushes on the very first sync against an empty cloud', async () => {
    meta.mockResolvedValue(metaOf(0));
    put.mockResolvedValue(metaOf(1));
    expect(await syncNow(local)).toEqual({ kind: 'pushed', rev: 1 });
    expect(put.mock.calls[0][0].base_rev).toBe(0);
  });

  it('pulls the cloud copy when only the cloud changed', async () => {
    const sha = await sha256(serialize(local));
    store.set('sync-state', { rev: 3, sha, syncedAt: D1 });
    const remote = ws({ students: [student('s1', 'Jane'), student('s2', 'From other device')] });
    meta.mockResolvedValue(metaOf(4));
    get.mockResolvedValue({ ...metaOf(4, 'remote-sha'), data: serialize(remote) });
    const out = await syncNow(local);
    expect(out.kind).toBe('pulled');
    if (out.kind !== 'pulled') return;
    expect(out.rev).toBe(4);
    expect(out.ws.students.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(put).not.toHaveBeenCalled();
    expect(await getSyncState()).toMatchObject({ rev: 4, sha: await sha256(serialize(out.ws)) });
  });

  it('pulls instead of conflicting when this device is empty (fresh install)', async () => {
    store.set('sync-state', { rev: 0, sha: 'never', syncedAt: null });
    meta.mockResolvedValue(metaOf(7));
    get.mockResolvedValue({ ...metaOf(7), data: serialize(local) });
    const out = await syncNow(ws());
    expect(out.kind).toBe('pulled');
  });

  it('reports a conflict when both sides changed, without uploading', async () => {
    store.set('sync-state', { rev: 3, sha: 'stale', syncedAt: D1 });
    const remote = ws({ students: [student('s9', 'Remote only')] });
    meta.mockResolvedValue(metaOf(4));
    get.mockResolvedValue({ ...metaOf(4, 'other'), data: serialize(remote) });
    const out = await syncNow(local);
    expect(out).toMatchObject({ kind: 'conflict', cloudRev: 4, cloudDevice: 'Other PC', cloudUpdatedAt: D2 });
    if (out.kind === 'conflict') expect(out.cloud.students[0].id).toBe('s9');
    expect(put).not.toHaveBeenCalled();
    expect(await getSyncState()).toMatchObject({ rev: 3 });
  });

  it('is up to date when the cloud already holds identical content', async () => {
    store.set('sync-state', { rev: 1, sha: 'stale', syncedAt: D1 });
    const sha = await sha256(serialize(local));
    meta.mockResolvedValue(metaOf(9, sha));
    get.mockResolvedValue({ ...metaOf(9, sha), data: serialize(local) });
    expect(await syncNow(local)).toEqual({ kind: 'up-to-date' });
    expect(await getSyncState()).toMatchObject({ rev: 9, sha });
  });

  it('turns a 409 from the server into a conflict', async () => {
    store.set('sync-state', { rev: 2, sha: 'x', syncedAt: D1 });
    meta.mockResolvedValue(metaOf(2));
    put.mockRejectedValue(new ApiError('conflict', 409, { rev: 3, device: 'Phone', updated_at: D2, data: serialize(ws({ students: [student('p', 'Phone')] })) }));
    const out = await syncNow(local);
    expect(out).toMatchObject({ kind: 'conflict', cloudRev: 3, cloudDevice: 'Phone' });
    expect(await getSyncState()).toMatchObject({ rev: 2 });
  });

  it('rethrows other server errors', async () => {
    store.set('sync-state', { rev: 2, sha: 'x', syncedAt: D1 });
    meta.mockResolvedValue(metaOf(2));
    put.mockRejectedValue(new ApiError('boom', 500));
    await expect(syncNow(local)).rejects.toThrow('boom');
  });

  it('resolveWith forces an upload; acceptCloud records the cloud revision', async () => {
    put.mockResolvedValue(metaOf(11));
    expect(await resolveWith(local, 10)).toEqual({ kind: 'pushed', rev: 11 });
    expect(put.mock.calls[0][0]).toMatchObject({ base_rev: 10, force: true });
    await acceptCloud(local, 12);
    expect(await getSyncState()).toMatchObject({ rev: 12, sha: await sha256(serialize(local)) });
  });

  it('treats an empty cloud payload as an empty workspace', async () => {
    store.set('sync-state', { rev: 1, sha: 'x', syncedAt: D1 });
    meta.mockResolvedValue(metaOf(2));
    get.mockResolvedValue({ ...metaOf(2), data: null });
    const out = await syncNow(ws());
    expect(out.kind).toBe('pulled');
  });
});
