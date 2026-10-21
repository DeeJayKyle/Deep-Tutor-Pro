import { describe, expect, it } from 'vitest';
import { assemble, sourcesOf, stageOf } from '../src/lib/stream';
import type { StreamEvent } from '../src/lib/api';

const c = (content: string, extra: Partial<StreamEvent> = {}): StreamEvent => ({ type: 'content', content, ...extra });

describe('assemble', () => {
  it('rebuilds interleaved chunked rounds in order of first appearance', () => {
    const events = [
      c('Hel', { call_id: 'r1', trace_kind: 'llm_chunk' }),
      c('Wor', { call_id: 'r2', trace_kind: 'llm_chunk' }),
      c('lo', { call_id: 'r1', trace_kind: 'llm_chunk' }),
      c('ld', { call_id: 'r2', trace_kind: 'llm_chunk' }),
    ];
    expect(assemble(events)).toBe('Hello\n\nWorld');
  });

  it('keeps llm_output blocks whole and merges consecutive legacy content', () => {
    const events: StreamEvent[] = [
      { type: 'stage_start', content: '', stage: 'thinking' },
      c('Plan', { call_id: 'a', trace_kind: 'llm_chunk' }),
      c('## Final answer', { trace_kind: 'llm_output' }),
      c('part 1, '),
      c('part 2'),
      c('', { call_id: 'a', trace_kind: 'llm_chunk' }),
      c('Second block', { trace_kind: 'llm_output' }),
      c('tail'),
      { type: 'result', content: '', response: 'ignored because content exists' },
    ];
    expect(assemble(events)).toBe('Plan\n\n## Final answer\n\npart 1, part 2\n\nSecond block\n\ntail');
  });

  it('falls back to the result response when no content streamed', () => {
    expect(assemble([{ type: 'progress', content: 'x' }, { type: 'result', content: '', response: 'The answer' }])).toBe('The answer');
    expect(assemble([c('   ', { trace_kind: 'llm_output' }), { type: 'result', content: '', response: 'Fallback' }])).toBe('Fallback');
    expect(assemble([])).toBe('');
  });
});

describe('sourcesOf / stageOf', () => {
  it('collects unique sources with title fallbacks', () => {
    const events: StreamEvent[] = [
      { type: 'sources', content: '', sources: [{ title: 'WHO', url: 'https://who.int' }, { url: 'https://x.org' }, { source: 'Book.pdf' }] },
      { type: 'sources', content: '', sources: [{ title: 'WHO again', url: 'https://who.int' }, {}] },
      { type: 'content', content: 'x', sources: [{ title: 'not a sources event' }] },
    ];
    expect(sourcesOf(events)).toEqual([
      { title: 'WHO', url: 'https://who.int' },
      { title: 'https://x.org', url: 'https://x.org' },
      { title: 'Book.pdf', url: '' },
    ]);
  });
  it('reports the latest stage', () => {
    expect(stageOf([{ type: 'stage_start', content: '', stage: 'plan' }, c('x'), { type: 'progress', content: 'Searching the web' }])).toBe('Searching the web');
    expect(stageOf([c('x')])).toBe('');
  });
});
