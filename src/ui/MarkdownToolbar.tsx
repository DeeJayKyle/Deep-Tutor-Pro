import type { RefObject } from 'react';
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Quote, Table, Tag } from 'lucide-react';

type Edit = (text: string, start: number, end: number) => { text: string; start: number; end: number };

/** Wrap the selection (or insert a placeholder) with inline markers. */
export const wrap = (marker: string, placeholder: string): Edit => (text, start, end) => {
  const sel = text.slice(start, end) || placeholder;
  const out = text.slice(0, start) + marker + sel + marker + text.slice(end);
  return { text: out, start: start + marker.length, end: start + marker.length + sel.length };
};

/** Prefix every selected line (or the current line); blank lines stay blank and are not counted. */
export const prefixLines = (prefix: (i: number) => string): Edit => (text, start, end) => {
  // A selection of whole lines ends just after a newline: the next line is not part of it.
  if (end > start && text[end - 1] === '\n') end -= 1;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end);
  let n = 0;
  const lines = text
    .slice(lineStart, lineEnd)
    .split('\n')
    .map((l) => (l.trim() ? prefix(n++) + l.replace(/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s)/, '') : l));
  const block = lines.join('\n');
  return { text: text.slice(0, lineStart) + block + text.slice(lineEnd), start: lineStart, end: lineStart + block.length };
};

/** Insert text after the selection (or at the cursor), keeping the selection. */
export const insertAfter = (insert: string): Edit => (text, start, end) => {
  const at = end;
  const lead = at > 0 && !/\s/.test(text[at - 1]) ? ' ' : '';
  const out = text.slice(0, at) + lead + insert + text.slice(at);
  return { text: out, start: at + lead.length, end: at + lead.length + insert.length };
};

export const insertBlock = (block: string): Edit => (text, start) => {
  const before = text.slice(0, start);
  const pad = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
  const out = before + pad + block + '\n' + text.slice(start);
  const at = before.length + pad.length;
  return { text: out, start: at, end: at + block.length };
};

const TOOLS: { label: string; icon: typeof Bold; edit: Edit; key?: string }[] = [
  { label: 'Heading', icon: Heading2, edit: prefixLines(() => '## ') },
  { label: 'Subheading', icon: Heading3, edit: prefixLines(() => '### ') },
  { label: 'Bold (Ctrl+B)', icon: Bold, edit: wrap('**', 'bold text'), key: 'b' },
  { label: 'Italic (Ctrl+I)', icon: Italic, edit: wrap('*', 'italic text'), key: 'i' },
  { label: 'Bullet list', icon: List, edit: prefixLines(() => '- ') },
  { label: 'Numbered list', icon: ListOrdered, edit: prefixLines((i) => `${i + 1}. `) },
  { label: 'Quote / clinical pearl', icon: Quote, edit: prefixLines(() => '> ') },
  { label: 'Table', icon: Table, edit: insertBlock('| Column 1 | Column 2 |\n|---|---|\n| | |') },
  { label: 'Source tag', icon: Tag, edit: insertAfter('[Source: S1]') },
];

export function MarkdownToolbar({ target, onChange }: { target: RefObject<HTMLTextAreaElement | null>; onChange: (text: string) => void }) {
  const apply = (edit: Edit) => {
    const el = target.current;
    if (!el) return;
    el.focus();
    const r = edit(el.value, el.selectionStart, el.selectionEnd);
    replaceText(el, r, onChange);
  };
  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 border-line bg-panel2 p-1">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <button key={t.label} type="button" title={t.label} aria-label={t.label} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(t.edit)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-panel hover:text-ink">
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Ctrl/Cmd+B and +I shortcuts for a textarea. */
export function formattingShortcut(e: React.KeyboardEvent<HTMLTextAreaElement>, onChange: (text: string) => void): void {
  if (!(e.ctrlKey || e.metaKey)) return;
  const tool = TOOLS.find((t) => t.key === e.key.toLowerCase());
  if (!tool) return;
  e.preventDefault();
  const el = e.currentTarget;
  replaceText(el, tool.edit(el.value, el.selectionStart, el.selectionEnd), onChange);
}

/**
 * Apply an edit as a native text insertion of just the changed span, so the
 * browser's undo (Ctrl+Z) can take it back; falls back to setting the value.
 */
function replaceText(el: HTMLTextAreaElement, r: ReturnType<Edit>, onChange: (text: string) => void): void {
  const old = el.value;
  let a = 0;
  while (a < old.length && a < r.text.length && old[a] === r.text[a]) a++;
  let b = 0;
  while (b < old.length - a && b < r.text.length - a && old[old.length - 1 - b] === r.text[r.text.length - 1 - b]) b++;
  el.setSelectionRange(a, old.length - b);
  let done = false;
  try {
    done = typeof document.execCommand === 'function' && document.execCommand('insertText', false, r.text.slice(a, r.text.length - b));
  } catch {
    done = false;
  }
  if (!done || el.value !== r.text) onChange(r.text);
  requestAnimationFrame(() => el.setSelectionRange(r.start, r.end));
}
