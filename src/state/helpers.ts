import type { ProviderChoice, Reference, Topic, Unit, Workspace } from '../lib/model';
import type { SourceText, TopicCtx, UnitCtx } from '../lib/api';
import { getSession } from '../lib/api';
import { relevantExcerpt } from '../lib/extract';
import { unitTotalHours } from '../lib/curriculum';
import { store } from './store';

export class NeedsSignIn extends Error {
  constructor() {
    super('Sign in to the DeepTutor server (Settings › Account) to use AI features. Everything else works offline.');
  }
}

/** The tutor's chosen AI provider; throws when not signed in. */
export function aiProvider(): ProviderChoice {
  if (!getSession()) throw new NeedsSignIn();
  return store.get().settings.provider;
}

export const unitCtx = (u: Unit): UnitCtx => ({ code: u.code, title: u.title, year: u.year, overview: u.overview.slice(0, 3000), total_hours: unitTotalHours(u) });

export const topicCtx = (t: Topic): TopicCtx => ({ title: t.title, hours: t.hours, objectives: t.objectives, subtopics: t.subtopics, practicals: t.practicals });

/** References linked to a unit (curriculum documents last: they rarely hold teaching content). */
export function unitReferences(ws: Workspace, unit: Unit): Reference[] {
  return ws.references
    .filter((r) => r.unitIds.includes(unit.id) || unit.referenceIds.includes(r.id))
    .sort((a, b) => Number(a.category === 'curriculum') - Number(b.category === 'curriculum'));
}

/** Excerpts of the chosen references most relevant to a topic, numbered S1, S2… */
export function sourcesFor(refs: Reference[], query: string, budget = 48_000): SourceText[] {
  const usable = refs.filter((r) => r.text.trim());
  if (!usable.length) return [];
  const per = Math.max(4000, Math.floor(budget / usable.length));
  return usable.slice(0, 10).map((r, i) => ({ id: `S${i + 1}`, title: r.name, text: relevantExcerpt(r.text, query, per) }));
}

export function programmeTitle(ws: Workspace, unit?: Unit): string {
  return ws.programmes.find((p) => p.id === unit?.programmeId)?.title ?? '';
}

export function docMeta(ws: Workspace, title: string, subtitle: string, status: 'draft' | 'final' = 'draft', aiAssisted = true) {
  return { title, subtitle, institution: ws.settings.institution, author: ws.settings.tutorName || 'Deep Tutor Pro', status, aiAssisted };
}

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
