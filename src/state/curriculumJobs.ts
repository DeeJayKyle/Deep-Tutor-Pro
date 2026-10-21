import type { Unit } from '../lib/model';
import { api } from '../lib/api';
import { applyUnitDetail, findUnitStart, hourRanges } from '../lib/curriculum';
import { now, uid, unitLabel } from '../lib/workspace';
import { aiProvider, programmeTitle, sourcesFor, topicCtx, unitCtx, unitReferences } from './helpers';
import { runJob } from './jobs';
import { store, update } from './store';

/** The part of the programme's curriculum text that describes one unit. */
export function sectionForUnit(text: string, unit: Unit, all: Unit[]): string {
  const start = findUnitStart(text, { start_marker: '', code: unit.code, title: unit.title });
  if (start < 0) return text.slice(0, 60_000);
  const others = all
    .filter((u) => u.id !== unit.id)
    .map((u) => findUnitStart(text, { start_marker: '', code: u.code, title: u.title }, start + 50))
    .filter((p) => p > start);
  const end = Math.min(...others, text.length);
  return text.slice(start, Math.min(Math.max(end, start + 4000), start + 60_000));
}

/** Extract topics, contact hours and objectives for each unit from the curriculum. */
export function analyseUnits(programmeId: string, unitIds?: string[]) {
  const provider = aiProvider();
  const ws = store.get();
  const programme = ws.programmes.find((p) => p.id === programmeId);
  if (!programme) throw new Error('Programme not found.');
  const source = ws.references.find((r) => r.id === programme.sourceReferenceId);
  if (!source) throw new Error('The curriculum document for this programme is no longer in the library. Upload it again.');
  const units = ws.units.filter((u) => u.programmeId === programmeId);
  const todo = units.filter((u) => (unitIds ? unitIds.includes(u.id) : !u.analysed));
  return runJob({ id: `analyse-${programmeId}`, label: `Analysing ${programme.title}`, link: `/programmes/${programmeId}`, items: todo, concurrency: 2 }, async (unit, ctx) => {
    ctx.step(`Reading ${unitLabel(unit)}…`);
    const section = sectionForUnit(source.text, unit, units);
    const detail = await api.unitDetail(programme.title, unitCtx(unit), section, provider, ctx.signal);
    update((w) => ({ ...w, units: w.units.map((u) => (u.id === unit.id ? applyUnitDetail(u, detail) : u)) }));
    ctx.advance(`${unitLabel(unit)}: ${detail.topics.length} topics`);
  });
}

/** Write lecture notes for topics of a unit, organised by contact hours. */
export function generateUnitNotes(unitId: string, topicIds: string[], opts: { referenceIds?: string[]; instructions?: string } = {}) {
  const provider = aiProvider();
  const ws = store.get();
  const unit = ws.units.find((u) => u.id === unitId);
  if (!unit) throw new Error('Course unit not found.');
  const refs = opts.referenceIds ? ws.references.filter((r) => opts.referenceIds!.includes(r.id)) : unitReferences(ws, unit);
  const ranges = hourRanges(unit.topics);
  const topics = unit.topics.filter((t) => topicIds.includes(t.id));
  return runJob({ id: `notes-${unitId}`, label: `Writing notes for ${unit.code || unit.title}`, link: `/units/${unitId}?tab=notes`, items: topics, concurrency: 2 }, async (topic, ctx) => {
    ctx.step(`Writing “${topic.title}”…`);
    const range = ranges[topic.id];
    const sources = sourcesFor(refs, `${topic.title} ${topic.subtopics.join(' ')} ${topic.objectives.join(' ')}`);
    const res = await api.notes(
      {
        programme: programmeTitle(ws, unit),
        unit: unitCtx(unit),
        topic: topicCtx(topic),
        hour_start: range.start,
        sources,
        detail: store.get().settings.noteDetail,
        instructions: opts.instructions,
      },
      provider,
      ctx.signal,
    );
    const t = now();
    update((w) => {
      const existing = w.notes.find((n) => n.unitId === unitId && n.topicId === topic.id);
      const note = {
        id: existing?.id ?? uid('n-'),
        unitId,
        topicId: topic.id,
        title: topic.title,
        markdown: res.markdown,
        hourStart: range.start,
        hourEnd: range.end,
        status: 'draft' as const,
        sourceIds: refs.filter((r) => r.text.trim()).slice(0, 10).map((r) => r.id),
        model: res.model,
        createdAt: existing?.createdAt ?? t,
        updatedAt: t,
      };
      return { ...w, notes: existing ? w.notes.map((n) => (n.id === existing.id ? note : n)) : [...w.notes, note] };
    });
    ctx.advance(`Finished “${topic.title}”`);
  });
}
