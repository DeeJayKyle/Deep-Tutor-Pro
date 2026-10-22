import { describe, expect, it } from 'vitest';
import { insertAfter, insertBlock, prefixLines, wrap } from '../src/ui/MarkdownToolbar';
import { rankItems } from '../src/ui/CommandPalette';
import { bandCounts } from '../src/ui/Charts';
import { nextSteps } from '../src/views/Home';
import { normalizeWorkspace } from '../src/lib/workspace';

describe('formatting toolbar edits', () => {
  it('wraps the selection, or inserts a selected placeholder', () => {
    expect(wrap('**', 'bold')('make this strong', 10, 16)).toEqual({ text: 'make this **strong**', start: 12, end: 18 });
    const r = wrap('*', 'italic')('ab', 1, 1);
    expect(r.text).toBe('a*italic*b');
    expect(r.text.slice(r.start, r.end)).toBe('italic');
  });

  it('prefixes every selected line and replaces an existing list or heading marker', () => {
    const text = 'Intro\n- one\n## two\nthree';
    const r = prefixLines((i) => `${i + 1}. `)(text, 7, text.length);
    expect(r.text).toBe('Intro\n1. one\n2. two\n3. three');
  });

  it('does not touch the line after a whole-line selection, and leaves blank lines alone', () => {
    expect(prefixLines(() => '## ')('a\nb\nc', 0, 2).text).toBe('## a\nb\nc');
    expect(prefixLines((i) => `${i + 1}. `)('one\n\ntwo', 0, 8).text).toBe('1. one\n\n2. two');
  });

  it('adds a source tag after the selection instead of doing nothing', () => {
    const r = insertAfter('[Source: S1]')('Digoxin has a narrow margin.', 0, 28);
    expect(r.text).toBe('Digoxin has a narrow margin. [Source: S1]');
    expect(r.text.slice(r.start, r.end)).toBe('[Source: S1]');
  });

  it('inserts a block on its own paragraph', () => {
    const r = insertBlock('| a | b |')('Para', 4, 4);
    expect(r.text).toBe('Para\n\n| a | b |\n');
  });
});

describe('command palette ranking', () => {
  const items = [
    { label: 'Pharmacology I', sub: 'Course unit' },
    { label: 'Clinical pharmacy', sub: 'Course unit' },
    { label: 'Amina Nakato', sub: 'Student · DIP/PHA/2026/001' },
  ];
  it('needs every word to match and prefers prefix matches', () => {
    expect(rankItems(items, 'pharm').map((i) => i.label)).toEqual(['Pharmacology I', 'Clinical pharmacy']);
    expect(rankItems(items, 'nakato 2026').map((i) => i.label)).toEqual(['Amina Nakato']);
    expect(rankItems(items, 'zzz')).toEqual([]);
  });
});

describe('bandCounts', () => {
  it('counts marks into 10-point bands with 100 in the top band', () => {
    const bins = bandCounts([0, 9.9, 49.5, 50, 100, 95]);
    expect(bins.map((b) => b.value)).toEqual([2, 0, 0, 0, 1, 1, 0, 0, 0, 2]);
    expect(bins[9].detail).toBe('2 students scored 90–100%');
  });
});

describe('Home next steps', () => {
  it('starts a new tutor with importing the curriculum and signing in', () => {
    const steps = nextSteps(normalizeWorkspace({}), false).map((s) => s.title);
    expect(steps).toEqual(['Import your curriculum', 'Sign in to switch on AI and sync']);
  });

  it('points at the first unit with topics that have no notes, and at drafts to review', () => {
    const ws = normalizeWorkspace({
      units: [{ id: 'u1', code: 'PHA 112', title: 'Pharmacology', analysed: true, topics: [{ id: 't1', title: 'PK' }, { id: 't2', title: 'PD' }] }],
      notes: [{ id: 'n1', unitId: 'u1', topicId: 't1', status: 'draft' }],
      papers: [{ id: 'p1', unitId: 'u1', status: 'final' }],
    });
    const steps = nextSteps(ws, true);
    expect(steps[0]).toMatchObject({ title: 'Write notes for PHA 112', to: '/units/u1?tab=notes' });
    expect(steps.map((s) => s.title)).toContain('Approve 1 draft note');
    expect(steps.map((s) => s.title)).not.toContain('Review 1 draft paper');
  });
});
