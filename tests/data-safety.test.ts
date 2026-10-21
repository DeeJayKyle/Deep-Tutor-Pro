import { describe, expect, it } from 'vitest';
import { normalizeWorkspace, emptyWorkspace } from '../src/lib/workspace';
import { isEmptyWorkspace, mergeWorkspaces } from '../src/lib/sync';
import { stampChanges } from '../src/state/store';
import { applyUnitDetail } from '../src/lib/curriculum';
import { toCsv } from '../src/lib/roster';
import type { Unit, Workspace } from '../src/lib/model';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-02-01T00:00:00.000Z';
const T2 = '2026-03-01T00:00:00.000Z';

const ws = (over: Partial<Workspace>): Workspace => ({ ...normalizeWorkspace({}), ...over });
const student = (id: string, firstName: string, updatedAt = T0) => normalizeWorkspace({ students: [{ id, firstName, createdAt: T0, updatedAt }] }).students[0];

describe('stampChanges (edit timestamps and deletion records)', () => {
  it('stamps edited items that have no timestamp field change of their own', () => {
    const before = ws({ classes: [{ id: 'c1', name: 'Year 1', year: 1, intake: '', academicYear: '', notes: '', createdAt: T0 }] });
    const after = { ...before, classes: [{ ...before.classes[0], name: 'Year 1 (2026)' }] };
    const out = stampChanges(before, after, T2);
    expect(out.classes[0].updatedAt).toBe(T2);
    // An unchanged list is left alone.
    expect(stampChanges(before, before, T2)).toBe(before);
  });

  it('records deleted ids so a merge does not bring them back', () => {
    const a = ws({ students: [student('s1', 'Ann'), student('s2', 'Ben')] });
    const deletedOnA = stampChanges(a, { ...a, students: [a.students[0]] }, T2);
    expect(deletedOnA.deleted.s2).toBe(T2);
    // Device B still has Ben (unchanged since T0); combining must keep him deleted.
    const merged = mergeWorkspaces(a, deletedOnA);
    expect(merged.students.map((s) => s.id)).toEqual(['s1']);
  });

  it('keeps an item that was edited after it was deleted elsewhere', () => {
    const local = ws({ students: [student('s2', 'Ben edited', T2)] });
    const remote = ws({ deleted: { s2: T1 } });
    expect(mergeWorkspaces(local, remote).students.map((s) => s.firstName)).toEqual(['Ben edited']);
  });

  it('stamps settings so the newest settings win when devices are combined', () => {
    const base = ws({});
    const changed = stampChanges(base, { ...base, settings: { ...base.settings, passMark: 40 } }, T2);
    expect(changed.settings.updatedAt).toBe(T2);
    const older = ws({ settings: { ...base.settings, passMark: 60, updatedAt: T1 } });
    expect(mergeWorkspaces(older, changed).settings.passMark).toBe(40);
    expect(mergeWorkspaces(changed, older).settings.passMark).toBe(40);
  });

  it('tombstones survive saving and loading, and very old ones are pruned', () => {
    const old = new Date(Date.now() - 400 * 864e5).toISOString();
    const recent = new Date().toISOString();
    const loaded = normalizeWorkspace({ deleted: { gone: recent, ancient: old, bad: 5 } });
    expect(loaded.deleted).toEqual({ gone: recent });
  });
});

describe('isEmptyWorkspace', () => {
  it('is true only for a device with nothing of the tutor’s own', () => {
    expect(isEmptyWorkspace(emptyWorkspace())).toBe(true);
    const chats = normalizeWorkspace({ chats: [{ id: 'c', kind: 'solve', title: 'q', messages: [] }] });
    expect(isEmptyWorkspace(chats)).toBe(false);
    const settings = emptyWorkspace();
    settings.settings.updatedAt = T1;
    expect(isEmptyWorkspace(settings)).toBe(false);
  });
});

describe('applyUnitDetail keeps topic ids', () => {
  it('re-reading an outline keeps the ids of topics that are still there', () => {
    const unit = normalizeWorkspace({ units: [{ id: 'u', title: 'Pharmacology', topics: [{ id: 't-pk', title: 'Pharmacokinetics', hours: 10 }, { id: 't-pd', title: 'Pharmacodynamics', hours: 10 }] }] }).units[0] as Unit;
    const next = applyUnitDetail(unit, {
      overview: '',
      aims: [],
      learning_outcomes: [],
      topics: [
        { title: 'pharmacokinetics', hours: 12, objectives: ['ADME'], subtopics: [], practicals: '' },
        { title: 'Drug interactions', hours: 4, objectives: [], subtopics: [], practicals: '' },
      ],
      teaching_methods: [],
      assessment: '',
      references: [],
      hours_estimated: false,
    });
    expect(next.topics[0].id).toBe('t-pk');
    expect(next.topics[0].hours).toBe(12);
    expect(next.topics[1].id).not.toBe('t-pd');
  });
});

describe('toCsv', () => {
  it('neutralises spreadsheet formulas typed into names', () => {
    expect(toCsv([['=HYPERLINK("http://x")', '+1', 'Ann', 42]])).toBe(`"'=HYPERLINK(""http://x"")",'+1,Ann,42`);
  });
});
