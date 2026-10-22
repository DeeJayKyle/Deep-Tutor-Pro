import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ClipboardList, FileText, GraduationCap, Search, User, Users, CornerDownLeft } from 'lucide-react';
import { useWorkspace } from '../state/store';
import { navigate } from '../state/router';
import { fullName, unitLabel } from '../lib/workspace';
import { cx } from './kit';

interface Item {
  id: string;
  label: string;
  sub: string;
  to: string;
  kind: 'Screen' | 'Unit' | 'Topic' | 'Note' | 'Paper' | 'Student' | 'Class' | 'Programme';
}

const ICON = { Screen: Search, Unit: BookOpen, Topic: BookOpen, Note: FileText, Paper: ClipboardList, Student: User, Class: Users, Programme: GraduationCap };

/** Ranks items by how well every word of the query matches (prefix matches first). */
export function rankItems<T extends { label: string; sub: string }>(items: T[], query: string, limit = 12): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items.slice(0, limit);
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    const hay = `${label} ${item.sub.toLowerCase()}`;
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    for (const w of words) score += label.startsWith(w) ? 3 : label.includes(` ${w}`) ? 2 : label.includes(w) ? 1 : 0;
    scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.item.label.length - b.item.label.length).slice(0, limit).map((x) => x.item);
}

const SCREENS: [string, string][] = [
  ['Home', '/'],
  ['Curriculum', '/curriculum'],
  ['Import a curriculum', '/curriculum?import=1'],
  ['Classes & units', '/units'],
  ['Reference library', '/library'],
  ['Lecture notes', '/notes'],
  ['Exams & coursework', '/assessments'],
  ['New exam or assignment', '/assessments/new'],
  ['Question bank', '/bank'],
  ['Students & marks', '/students'],
  ['Deep Solve', '/solve'],
  ['Tutor chat & research', '/research'],
  ['Knowledge bases', '/knowledge'],
  ['Settings', '/settings'],
  ['Grading settings', '/settings?tab=grading'],
  ['Sync & backup', '/settings?tab=data'],
];

/** Another dialog (a form, the sync conflict) is open: leave it in charge of the keyboard. */
const otherDialogOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]:not([data-palette])');

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (otherDialogOpen()) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => {
      if (!otherDialogOpen()) setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('dtp-open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dtp-open-palette', onOpen);
    };
  }, []);
  return open ? <Palette onClose={() => setOpen(false)} /> : null;
}

/** Mounted only while open, so the search index is not rebuilt on every edit. */
function Palette({ onClose }: { onClose: () => void }) {
  const ws = useWorkspace();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = SCREENS.map(([label, to]) => ({ id: `s${to}`, label, sub: 'Go to screen', to, kind: 'Screen' }));
    for (const p of ws.programmes) out.push({ id: p.id, label: p.title, sub: 'Programme', to: `/programmes/${p.id}`, kind: 'Programme' });
    for (const u of ws.units) {
      out.push({ id: u.id, label: unitLabel(u), sub: `Course unit · Year ${u.year}`, to: `/units/${u.id}`, kind: 'Unit' });
      for (const t of u.topics) out.push({ id: t.id, label: t.title, sub: `Topic · ${u.code || u.title}`, to: `/units/${u.id}?tab=notes`, kind: 'Topic' });
    }
    for (const n of ws.notes) out.push({ id: n.id, label: n.title, sub: 'Lecture notes', to: `/notes/${n.id}`, kind: 'Note' });
    for (const p of ws.papers) out.push({ id: p.id, label: p.title, sub: `Paper · ${p.status}`, to: `/assessments/${p.id}`, kind: 'Paper' });
    for (const c of ws.classes) out.push({ id: c.id, label: c.name, sub: `Class · Year ${c.year}`, to: `/students/class/${c.id}`, kind: 'Class' });
    for (const s of ws.students) out.push({ id: s.id, label: fullName(s), sub: `Student · ${s.regNo || 'no reg. no.'}`, to: `/students/${s.id}`, kind: 'Student' });
    return out;
  }, [ws]);

  const results = useMemo(() => rankItems(items, q, 12), [items, q]);
  const go = (item?: Item) => {
    if (!item) return;
    onClose();
    const [path, query] = item.to.split('?');
    navigate(path, query ? Object.fromEntries(new URLSearchParams(query)) : undefined);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" data-palette aria-label="Search everything" className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              }
              if (e.key === 'Enter') go(results[active]);
            }}
            placeholder="Search units, topics, notes, papers, students…"
            aria-label="Search everything"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `pal-${results[active].id}` : undefined}
            className="w-full bg-transparent py-3.5 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden rounded border border-line px-1.5 text-[11px] text-muted sm:block">Esc</kbd>
        </div>
        <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{q}”.</li>}
          {results.map((r, i) => {
            const Icon = ICON[r.kind];
            return (
              <li
                key={`${r.kind}-${r.id}`}
                id={`pal-${r.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cx('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2', i === active && 'bg-accent/15')}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{r.label}</span>
                  <span className="block truncate text-xs text-muted">{r.sub}</span>
                </span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
