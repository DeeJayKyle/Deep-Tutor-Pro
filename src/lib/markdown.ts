// Minimal Markdown → block model. The same blocks drive the on-screen preview
// and every exporter (Word, PowerPoint, PDF), so formatting stays consistent.

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'para'; text: string }
  | { type: 'list'; ordered: boolean; items: { text: string; depth: number }[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'hr' };

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  source?: boolean;
  link?: string;
}

const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

export function parseMarkdown(src: string): Block[] {
  const lines = String(src ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith('```')) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i += 1;
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].replace(/#+$/, '').trim() });
      i += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }
    if (trimmed.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const rows = [splitRow(trimmed)];
      i += 2;
      while (i < lines.length && lines[i].trim().includes('|')) rows.push(splitRow(lines[i++]));
      const width = rows[0].length;
      blocks.push({ type: 'table', rows: rows.map((r) => Array.from({ length: width }, (_, k) => r[k] ?? '')) });
      continue;
    }
    if (trimmed.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) body.push(lines[i++].trim().replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: body.join(' ').trim() });
      continue;
    }
    const listMatch = LIST_ITEM.exec(line);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2]);
      const items: { text: string; depth: number }[] = [];
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i]);
        // A top-level marker of the other kind starts a new list.
        if (m && items.length && !m[1] && /\d/.test(m[2]) !== ordered) break;
        if (m) {
          items.push({ text: m[3].trim(), depth: Math.min(3, Math.floor(m[1].replace(/\t/g, '  ').length / 2)) });
          i += 1;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1].text += ' ' + lines[i].trim();
          i += 1;
        } else break;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const body = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|>|```|(\s*)([-*+]|\d+[.)])\s)/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]))
    ) {
      body.push(lines[i++].trim());
    }
    blocks.push({ type: 'para', text: body.join(' ') });
  }
  return blocks;
}

/** Split inline text into styled runs. */
export function inlineRuns(text: string): Run[] {
  const runs: Run[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|`[^`]+`|\[Source:[^\]]+\]|\[([^\]]+)\]\(((?:https?:|#)[^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const src = String(text ?? '');
  while ((m = re.exec(src))) {
    if (m.index > last) runs.push({ text: src.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**') || tok.startsWith('__')) runs.push({ text: tok.slice(2, -2), bold: true });
    else if (tok.startsWith('`')) runs.push({ text: tok.slice(1, -1), code: true });
    else if (tok.startsWith('[Source:')) runs.push({ text: tok, source: true });
    else if (m[2]) runs.push({ text: m[2], link: m[3] });
    else runs.push({ text: tok.slice(1, -1), italic: true });
    last = m.index + tok.length;
  }
  if (last < src.length) runs.push({ text: src.slice(last) });
  return runs;
}

export const plainText = (text: string): string =>
  inlineRuns(text)
    .map((r) => r.text)
    .join('');

export interface Slide {
  title: string;
  level: number;
  bullets: { text: string; depth: number; bold?: boolean }[];
  notes: string[];
  tables: string[][][];
}

/** Split a deck or notes into slides on level-1/2 headings. */
export function toSlides(src: string): Slide[] {
  const slides: (Slide & { inNotes?: boolean })[] = [];
  let current: (Slide & { inNotes?: boolean }) | null = null;
  for (const block of parseMarkdown(src)) {
    if (block.type === 'heading' && block.level <= 2) {
      current = { title: plainText(block.text), level: block.level, bullets: [], notes: [], tables: [] };
      slides.push(current);
      continue;
    }
    if (!current) {
      current = { title: 'Overview', level: 2, bullets: [], notes: [], tables: [] };
      slides.push(current);
    }
    if (block.type === 'para' && /^notes?:/i.test(block.text)) {
      current.notes.push(plainText(block.text.replace(/^notes?:\s*/i, '')));
      current.inNotes = true;
    } else if (current.inNotes && (block.type === 'para' || block.type === 'list')) {
      if (block.type === 'para') current.notes.push(plainText(block.text));
      else current.notes.push(...block.items.map((it) => plainText(it.text)));
    } else if (block.type === 'list') {
      current.bullets.push(...block.items.map((it) => ({ text: plainText(it.text), depth: it.depth })));
    } else if (block.type === 'para' || block.type === 'quote') {
      current.bullets.push({ text: plainText(block.text), depth: 0 });
    } else if (block.type === 'heading') {
      current.bullets.push({ text: plainText(block.text), depth: 0, bold: true });
    } else if (block.type === 'table') {
      current.tables.push(block.rows.map((r) => r.map(plainText)));
    }
  }
  return slides.map(({ inNotes: _inNotes, ...s }) => s);
}

/** Share of statements in a draft that are tied to uploaded sources. */
export function provenance(src: string): { sourced: number; total: number; ratio: number; sources: string[] } {
  let sourced = 0;
  let total = 0;
  const visit = (text: string) => {
    total += 1;
    if (/\[Source:[^\]]+\]/.test(text)) sourced += 1;
  };
  for (const b of parseMarkdown(src)) {
    if (b.type === 'para' || b.type === 'quote') visit(b.text);
    if (b.type === 'list') b.items.forEach((it) => visit(it.text));
  }
  const tags = new Set((String(src).match(/\[Source:\s*([^\]]+)\]/g) || []).map((t) => t.replace(/\[Source:\s*|\]/g, '').trim()));
  return { sourced, total, ratio: total ? sourced / total : 0, sources: [...tags] };
}

/** Headings of a document, for a table of contents with in-page links. */
export function outline(src: string): { level: number; text: string; slug: string }[] {
  const seen = new Map<string, number>();
  return parseMarkdown(src)
    .filter((b): b is Extract<Block, { type: 'heading' }> => b.type === 'heading')
    .map((b) => {
      const text = plainText(b.text);
      const base = slugify(text) || 'section';
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return { level: b.level, text, slug: n ? `${base}-${n}` : base };
    });
}

export function slugify(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}
