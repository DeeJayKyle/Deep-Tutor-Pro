import { describe, expect, it } from 'vitest';
import { inlineRuns, outline, parseMarkdown, plainText, provenance, slugify, toSlides } from '../src/lib/markdown';

describe('parseMarkdown', () => {
  it('parses headings, paragraphs, quotes, code and rules', () => {
    const md = '# Title ##\n\nFirst line\nsecond line\n\n> quoted\n> more\n\n```\ncode  here\n# not heading\n```\n\n---\n\n###### Deep';
    expect(parseMarkdown(md)).toEqual([
      { type: 'heading', level: 1, text: 'Title' },
      { type: 'para', text: 'First line second line' },
      { type: 'quote', text: 'quoted more' },
      { type: 'code', text: 'code  here\n# not heading' },
      { type: 'hr' },
      { type: 'heading', level: 6, text: 'Deep' },
    ]);
  });

  it('starts a new list when switching between ordered and unordered', () => {
    const blocks = parseMarkdown('- a\n- b\n1. one\n2) two\n* c');
    expect(blocks).toEqual([
      { type: 'list', ordered: false, items: [{ text: 'a', depth: 0 }, { text: 'b', depth: 0 }] },
      { type: 'list', ordered: true, items: [{ text: 'one', depth: 0 }, { text: 'two', depth: 0 }] },
      { type: 'list', ordered: false, items: [{ text: 'c', depth: 0 }] },
    ]);
  });

  it('keeps nested items of the other kind inside the list and joins continuation lines', () => {
    const blocks = parseMarkdown('1. Step\n   - detail\n     continues here\n2. Next\n\nAfter');
    expect(blocks[0]).toEqual({
      type: 'list',
      ordered: true,
      items: [
        { text: 'Step', depth: 0 },
        { text: 'detail continues here', depth: 1 },
        { text: 'Next', depth: 0 },
      ],
    });
    expect(blocks[1]).toEqual({ type: 'para', text: 'After' });
  });

  it('caps list depth', () => {
    const [list] = parseMarkdown('- a\n          - deep');
    expect(list).toMatchObject({ items: [{ depth: 0 }, { depth: 3 }] });
  });

  it('parses tables, padding short rows and ignoring alignment colons', () => {
    const md = 'Intro\n| Drug | Dose | Route |\n|:---|---:|:--:|\n| Paracetamol | 1 g | PO |\n| Insulin |\nnext para';
    const blocks = parseMarkdown(md);
    expect(blocks[0]).toEqual({ type: 'para', text: 'Intro' });
    expect(blocks[1]).toEqual({
      type: 'table',
      rows: [
        ['Drug', 'Dose', 'Route'],
        ['Paracetamol', '1 g', 'PO'],
        ['Insulin', '', ''],
      ],
    });
    expect(blocks[2]).toEqual({ type: 'para', text: 'next para' });
  });

  it('treats a pipe line without a separator as text', () => {
    expect(parseMarkdown('a | b\nc')).toEqual([{ type: 'para', text: 'a | b c' }]);
  });

  it('copes with CRLF, empty and non-string input', () => {
    expect(parseMarkdown('# A\r\n\r\ntext')).toEqual([
      { type: 'heading', level: 1, text: 'A' },
      { type: 'para', text: 'text' },
    ]);
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown(undefined as unknown as string)).toEqual([]);
    expect(parseMarkdown('```\nunterminated')).toEqual([{ type: 'code', text: 'unterminated' }]);
  });
});

describe('inlineRuns', () => {
  it('splits bold, italic, code, links and source tags', () => {
    expect(inlineRuns('A **bold** and *it* `x()` [Source: BNF p.4] [site](https://e.org) end')).toEqual([
      { text: 'A ' },
      { text: 'bold', bold: true },
      { text: ' and ' },
      { text: 'it', italic: true },
      { text: ' ' },
      { text: 'x()', code: true },
      { text: ' ' },
      { text: '[Source: BNF p.4]', source: true },
      { text: ' ' },
      { text: 'site', link: 'https://e.org' },
      { text: ' end' },
    ]);
  });
  it('does not turn javascript: links into links', () => {
    expect(inlineRuns('[x](javascript:alert(1))').some((r) => r.link)).toBe(false);
  });
  it('plainText strips formatting', () => {
    expect(plainText('**Dose**: 5 *mg*')).toBe('Dose: 5 mg');
  });
});

describe('toSlides', () => {
  it('splits on level 1/2 headings and collects notes after Notes:', () => {
    const md = [
      'Intro line',
      '# Deck title',
      '## Pain',
      '- **Acute** pain',
      '  - short term',
      '### Drugs',
      '| Drug | Dose |',
      '|---|---|',
      '| PCM | 1 g |',
      'Notes: Ask the class first.',
      '- Point one',
      'Final remark',
      '## Next slide',
      '> quote',
    ].join('\n');
    const slides = toSlides(md);
    expect(slides.map((s) => s.title)).toEqual(['Overview', 'Deck title', 'Pain', 'Next slide']);
    expect(slides[0].bullets).toEqual([{ text: 'Intro line', depth: 0 }]);
    expect(slides[2].bullets).toEqual([
      { text: 'Acute pain', depth: 0 },
      { text: 'short term', depth: 1 },
      { text: 'Drugs', depth: 0, bold: true },
    ]);
    expect(slides[2].tables).toEqual([[['Drug', 'Dose'], ['PCM', '1 g']]]);
    expect(slides[2].notes).toEqual(['Ask the class first.', 'Point one', 'Final remark']);
    expect(slides[3]).toEqual({ title: 'Next slide', level: 2, bullets: [{ text: 'quote', depth: 0 }], notes: [], tables: [] });
    expect(slides.every((s) => !('inNotes' in s))).toBe(true);
  });
  it('returns no slides for empty input', () => {
    expect(toSlides('')).toEqual([]);
  });
});

describe('provenance / outline / slugify', () => {
  it('counts statements with source tags', () => {
    const md = '# H\n\nClaim one [Source: BNF]\n\n- item [Source: WHO guideline]\n- item two\n\n> quote [Source: BNF]\n\n| a | b |\n|---|---|\n| [Source: X] | y |';
    const p = provenance(md);
    expect(p).toMatchObject({ sourced: 3, total: 4, ratio: 0.75 });
    expect(p.sources.sort()).toEqual(['BNF', 'WHO guideline', 'X']);
    expect(provenance('# only heading')).toEqual({ sourced: 0, total: 0, ratio: 0, sources: [] });
  });
  it('builds unique slugs for a table of contents', () => {
    expect(outline('# Intro\n## Intro\n## **Dosage** & Routes\n## !!!')).toEqual([
      { level: 1, text: 'Intro', slug: 'intro' },
      { level: 2, text: 'Intro', slug: 'intro-1' },
      { level: 2, text: 'Dosage & Routes', slug: 'dosage-routes' },
      { level: 2, text: '!!!', slug: 'section' },
    ]);
  });
  it('slugify removes accents and punctuation and caps length', () => {
    expect(slugify('Café  au_lait!')).toBe('cafe-au-lait');
    expect(slugify('x'.repeat(200))).toHaveLength(80);
    expect(slugify(null as unknown as string)).toBe('');
  });
});
