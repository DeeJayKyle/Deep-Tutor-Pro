import type { StreamEvent } from './api';

/** Rebuild the answer text from DeepTutor's streamed events. */
export function assemble(events: StreamEvent[]): string {
  const rounds = new Map<string, string>();
  const order: ({ kind: 'round'; id: string } | { kind: 'block' | 'legacy'; text: string })[] = [];
  let result = '';
  for (const e of events) {
    if (e.type === 'content' && e.content) {
      if (e.call_id && e.trace_kind === 'llm_chunk') {
        if (!rounds.has(e.call_id)) {
          rounds.set(e.call_id, '');
          order.push({ kind: 'round', id: e.call_id });
        }
        rounds.set(e.call_id, rounds.get(e.call_id) + e.content);
      } else if (e.trace_kind === 'llm_output') {
        order.push({ kind: 'block', text: e.content });
      } else {
        const last = order[order.length - 1];
        if (last && last.kind === 'legacy') last.text += e.content;
        else order.push({ kind: 'legacy', text: e.content });
      }
    }
    if (e.type === 'result' && e.response) result = e.response;
  }
  const text = order
    .map((item) => (item.kind === 'round' ? rounds.get(item.id) ?? '' : item.text))
    .join('\n\n')
    .trim();
  return text || result;
}

export function sourcesOf(events: StreamEvent[]): { title: string; url: string }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const e of events) {
    for (const s of e.type === 'sources' ? e.sources ?? [] : []) {
      const raw = s as { title?: string; name?: string; url?: string; link?: string; source?: string };
      const title = raw.title || raw.name || raw.url || raw.source || '';
      const url = raw.url || raw.link || '';
      const key = url || title;
      if (title && !seen.has(key)) {
        seen.add(key);
        out.push({ title, url });
      }
    }
  }
  return out;
}

export function stageOf(events: StreamEvent[]): string {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (e.type === 'stage_start' || e.type === 'progress') return e.stage || e.content?.slice(0, 80) || '';
  }
  return '';
}
