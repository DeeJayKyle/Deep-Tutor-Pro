import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { href } from '../state/router';

export const cx = (...c: (string | number | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ------------------------------------------------------------------ Button --

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 border-transparent',
  secondary: 'bg-panel2 text-ink hover:bg-line/60 border-line',
  ghost: 'bg-transparent text-ink hover:bg-panel2 border-transparent',
  danger: 'bg-bad/10 text-bad hover:bg-bad/20 border-bad/30',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: React.ReactNode;
  busy?: boolean;
  size?: 'sm' | 'md';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', icon, busy, size = 'md', className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/** A link styled as a button, to another screen of the app. */
export function LinkButton({ to, query, variant = 'secondary', icon, children, className, size = 'md' }: { to: string; query?: Record<string, string | undefined>; variant?: Variant; icon?: React.ReactNode; children?: React.ReactNode; className?: string; size?: 'sm' | 'md' }) {
  return (
    <a
      href={href(to, query)}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition no-underline whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        VARIANT[variant],
        className,
      )}
    >
      {icon}
      {children}
    </a>
  );
}

/** In-app hyperlink. */
export function A({ to, query, children, className, title }: { to: string; query?: Record<string, string | undefined>; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <a href={href(to, query)} title={title} className={cx('text-accent hover:underline', className)}>
      {children}
    </a>
  );
}

// ------------------------------------------------------------------ Layout --

export function Page({ title, subtitle, actions, children, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {back && (
        <a href={href(back.to)} className="mb-2 inline-block text-xs text-muted hover:text-accent">
          ← {back.label}
        </a>
      )}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, actions, children, className, padded = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx('rounded-xl border border-line bg-panel', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function Empty({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h3 className="font-semibold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'muted', title }: { children: React.ReactNode; tone?: 'muted' | 'accent' | 'good' | 'warn' | 'bad'; title?: string }) {
  const tones = {
    muted: 'bg-panel2 text-muted',
    accent: 'bg-accent/15 text-accent',
    good: 'bg-good/15 text-good',
    warn: 'bg-warn/15 text-warn',
    bad: 'bg-bad/15 text-bad',
  };
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  );
}

export function Stat({ label, value, to, hint }: { label: string; value: React.ReactNode; to?: string; hint?: string }) {
  const body = (
    <div className="rounded-xl border border-line bg-panel p-4 transition hover:border-accent/60">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
  return to ? (
    <a href={href(to)} className="block no-underline">
      {body}
    </a>
  ) : (
    body
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label && <div className="mb-1 text-xs text-muted">{label}</div>}
      <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: React.ReactNode; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition', value === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink')}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded-full bg-panel2 px-1.5 text-[11px] text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------- Forms --

const inputCls = 'w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

export function Field({ label, hint, children, className }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactElement<{ id?: string }>; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      {React.cloneElement(children, { id })}
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx(inputCls, className)} {...p} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cx(inputCls, 'min-h-[80px] resize-y', className)} {...p} />;
});

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputCls, 'pr-8', className)} {...p}>
      {children}
    </select>
  );
}

/** Text input that commits on blur / Enter (avoids saving on every keystroke). */
export function EditableText({ value, onCommit, placeholder, className, multiline, ariaLabel, type = 'text', id }: { value: string; onCommit: (v: string) => void; placeholder?: string; className?: string; multiline?: boolean; ariaLabel?: string; type?: string; id?: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  if (multiline)
    return <Textarea id={id} aria-label={ariaLabel} className={className} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />;
  return (
    <Input
      id={id}
      aria-label={ariaLabel}
      type={type}
      className={className}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
    />
  );
}

/** Edit a list of short texts (objectives, subtopics…) as one line per item. */
export function LinesEditor({ value, onCommit, placeholder, ariaLabel, rows = 4, id }: { value: string[]; onCommit: (v: string[]) => void; placeholder?: string; ariaLabel?: string; rows?: number; id?: string }) {
  const text = value.join('\n');
  const [draft, setDraft] = useState(text);
  useEffect(() => {
    setDraft(text);
  }, [text]);
  return (
    <Textarea
      id={id}
      aria-label={ariaLabel}
      rows={rows}
      value={draft}
      placeholder={placeholder ?? 'One per line'}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft
          .split('\n')
          .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
          .filter(Boolean);
        if (next.join('\n') !== text) onCommit(next);
      }}
    />
  );
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; className?: string }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2 text-sm', className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

// ------------------------------------------------------------------ Modal --

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={cx('flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-lg')}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-panel2 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Toasts --

type Toast = { id: number; tone: 'good' | 'bad' | 'info'; text: string };
type Confirm = { text: string; detail?: string; danger?: boolean; ok: string; resolve: (v: boolean) => void };
const UiCtx = createContext<{ toast: (text: string, tone?: Toast['tone']) => void; confirm: (text: string, opts?: { detail?: string; danger?: boolean; ok?: string }) => Promise<boolean> }>({
  toast: () => undefined,
  confirm: async () => false,
});

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirm] = useState<Confirm | null>(null);
  const toast = useCallback((text: string, tone: Toast['tone'] = 'good') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'bad' ? 9000 : 4500);
  }, []);
  const confirm = useCallback(
    (text: string, opts: { detail?: string; danger?: boolean; ok?: string } = {}) => new Promise<boolean>((resolve) => setConfirm({ text, detail: opts.detail, danger: opts.danger, ok: opts.ok ?? 'OK', resolve })),
    [],
  );
  const close = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirm(null);
  };
  return (
    <UiCtx.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-20 right-3 z-[60] flex w-[min(92vw,380px)] flex-col gap-2 lg:bottom-4">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === 'bad' ? 'alert' : 'status'} className={cx('pointer-events-auto flex items-start gap-2 rounded-xl border bg-panel px-3 py-2.5 text-sm shadow-xl', t.tone === 'bad' ? 'border-bad/50' : t.tone === 'good' ? 'border-good/40' : 'border-line')}>
            {t.tone === 'bad' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" /> : t.tone === 'good' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
      <Modal
        open={!!confirmState}
        onClose={() => close(false)}
        title={confirmState?.text ?? ''}
        footer={
          <>
            <Button onClick={() => close(false)}>Cancel</Button>
            <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {confirmState?.ok}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{confirmState?.detail ?? 'Are you sure?'}</p>
      </Modal>
    </UiCtx.Provider>
  );
}

export const useUi = () => useContext(UiCtx);

/** Run an async action with busy state and error toasts. */
export function useAction() {
  const { toast } = useUi();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(key);
      try {
        const out = await fn();
        if (success) toast(success);
        return out;
      } catch (err) {
        toast((err as Error).message || String(err), 'bad');
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );
  return { busy, run };
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

/** Small "pick a file" button. */
export function FileButton({ accept, multiple, onFiles, children, icon, variant = 'secondary', capture, disabled }: { accept?: string; multiple?: boolean; onFiles: (files: File[]) => void; children: React.ReactNode; icon?: React.ReactNode; variant?: Variant; capture?: 'environment' | 'user'; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant={variant} icon={icon} onClick={() => ref.current?.click()} disabled={disabled}>
        {children}
      </Button>
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        capture={capture}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}
