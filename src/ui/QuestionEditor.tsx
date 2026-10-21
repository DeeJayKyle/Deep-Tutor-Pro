import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { Question, QuestionType } from '../lib/model';
import { TYPE_LABEL } from '../lib/papers';
import { Button, EditableText, Field, Select, Textarea, cx } from './kit';
import { Markdown } from './Markdown';

const letter = (i: number) => String.fromCharCode(65 + i);

/** Full editor for one question: prompt, options, answer, marking scheme, solution. */
export function QuestionEditor({ q, number, onChange, actions, defaultOpen = false }: { q: Question; number?: number; onChange: (q: Question) => void; actions?: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const set = (changes: Partial<Question>) => onChange({ ...q, ...changes });
  const pointsTotal = q.markingPoints.reduce((s, p) => s + p.marks, 0);
  const hasOptions = q.type === 'mcq' || q.type === 'true_false';
  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="flex items-start gap-2 p-3">
        {number !== undefined && <span className="mt-1 w-7 shrink-0 text-sm font-bold text-accent">{number}.</span>}
        <div className="min-w-0 flex-1">
          {open ? (
            <Textarea aria-label="Question" rows={3} value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} />
          ) : (
            <button className="w-full text-left text-sm" onClick={() => setOpen(true)}>
              {q.prompt || <span className="text-muted">Empty question — click to write it</span>}
            </button>
          )}
          {!open && hasOptions && (
            <ol className="mt-1 grid gap-x-4 text-xs text-muted sm:grid-cols-2">
              {q.options.map((o, i) => (
                <li key={i} className={cx(q.answerIndex === i && 'font-semibold text-good')}>
                  {letter(i)}. {o}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span>{TYPE_LABEL[q.type]}</span>
            {q.topic && <span>· {q.topic}</span>}
            <span>· {q.difficulty}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="w-16">
            <EditableText type="number" ariaLabel="Marks" value={String(q.marks)} onCommit={(v) => set({ marks: Math.max(0, Number(v) || 0) })} />
          </div>
          <span className="text-xs text-muted">mk</span>
          {actions}
          <Button size="sm" variant="ghost" aria-label={open ? 'Collapse' : 'Expand'} icon={open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} onClick={() => setOpen(!open)} />
        </div>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Type">
              <Select
                value={q.type}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  set({ type, options: type === 'true_false' ? ['True', 'False'] : type === 'mcq' && q.options.length < 2 ? ['', '', '', ''] : q.options, answerIndex: type === 'mcq' || type === 'true_false' ? q.answerIndex : null });
                }}
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Topic">
              <EditableText value={q.topic} onCommit={(v) => set({ topic: v })} />
            </Field>
            <Field label="Difficulty">
              <Select value={q.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
                {['easy', 'moderate', 'hard'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
          </div>
          {hasOptions && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Options (select the correct one)</div>
              <div className="space-y-1.5">
                {q.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" aria-label={`Option ${letter(i)} is correct`} checked={q.answerIndex === i} onChange={() => set({ answerIndex: i, answer: `${letter(i)}. ${o}` })} className="h-4 w-4" />
                    <span className="w-5 text-sm font-semibold">{letter(i)}.</span>
                    <EditableText value={o} ariaLabel={`Option ${letter(i)}`} onCommit={(v) => set({ options: q.options.map((x, j) => (j === i ? v : x)) })} />
                    {q.type === 'mcq' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Remove option"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => set({ options: q.options.filter((_, j) => j !== i), answerIndex: q.answerIndex === i ? null : q.answerIndex !== null && q.answerIndex > i ? q.answerIndex - 1 : q.answerIndex })}
                      />
                    )}
                  </div>
                ))}
              </div>
              {q.type === 'mcq' && q.options.length < 8 && (
                <Button size="sm" variant="ghost" className="mt-1" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set({ options: [...q.options, ''] })}>
                  Add option
                </Button>
              )}
            </div>
          )}
          {!hasOptions && (
            <Field label="Expected answer (short)">
              <Textarea rows={2} value={q.answer} onChange={(e) => set({ answer: e.target.value })} />
            </Field>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
              <span>Marking scheme</span>
              <span className={cx(pointsTotal && pointsTotal !== q.marks && 'text-warn')}>
                {pointsTotal} of {q.marks} marks allocated
              </span>
            </div>
            <div className="space-y-1.5">
              {q.markingPoints.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <EditableText value={p.point} ariaLabel={`Marking point ${i + 1}`} onCommit={(v) => set({ markingPoints: q.markingPoints.map((x, j) => (j === i ? { ...x, point: v } : x)) })} />
                  </div>
                  <div className="w-16">
                    <EditableText type="number" ariaLabel="Marks for point" value={String(p.marks)} onCommit={(v) => set({ markingPoints: q.markingPoints.map((x, j) => (j === i ? { ...x, marks: Math.max(0, Number(v) || 0) } : x)) })} />
                  </div>
                  <Button size="sm" variant="ghost" aria-label="Remove point" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => set({ markingPoints: q.markingPoints.filter((_, j) => j !== i) })} />
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-1" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set({ markingPoints: [...q.markingPoints, { point: '', marks: 1 }] })}>
              Add marking point
            </Button>
          </div>
          <Field label="Worked solution / model answer (Markdown)">
            <Textarea rows={5} value={q.solution} onChange={(e) => set({ solution: e.target.value })} />
          </Field>
          {q.solution && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted">Preview solution</summary>
              <Markdown source={q.solution} className="mt-2" />
            </details>
          )}
        </div>
      )}
    </div>
  );
}
