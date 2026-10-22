import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  BookOpen,
  BrainCircuit,
  ClipboardList,
  Cloud,
  CloudOff,
  Database,
  FileText,
  GraduationCap,
  Home,
  Library,
  ListChecks,
  Menu,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useRoute, href } from './state/router';
import { loadWorkspace, onSessionChanged, runSync, store, useSaveError, useSyncStatus, useWorkspace } from './state/store';
import { adoptCookieSession, getSession, loadSession, onSession } from './lib/api';
import { Button, Spinner, UiProvider, cx } from './ui/kit';
import { ConflictDialog } from './views/ConflictDialog';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { UpdateBanner } from './ui/UpdateBanner';
import { CommandPalette } from './ui/CommandPalette';
import { cancelJob, dismissJob, useJobs } from './state/jobs';

const HomeView = lazy(() => import('./views/Home'));
const CurriculumView = lazy(() => import('./views/Curriculum'));
const UnitsView = lazy(() => import('./views/Units'));
const LibraryView = lazy(() => import('./views/Library'));
const NotesView = lazy(() => import('./views/Notes'));
const AssessmentsView = lazy(() => import('./views/Assessments'));
const BankView = lazy(() => import('./views/Bank'));
const SolveView = lazy(() => import('./views/Solve'));
const ResearchView = lazy(() => import('./views/Research'));
const KnowledgeView = lazy(() => import('./views/Knowledge'));
const StudentsView = lazy(() => import('./views/Students'));
const SettingsView = lazy(() => import('./views/Settings'));

import { APP_VERSION } from './lib/version';

const NAV: { to: string; label: string; short?: string; icon: typeof Home; group: string }[] = [
  { to: '/', label: 'Home', icon: Home, group: '' },
  { to: '/curriculum', label: 'Curriculum', icon: GraduationCap, group: 'Plan' },
  { to: '/units', label: 'Classes & units', short: 'Units', icon: BookOpen, group: 'Plan' },
  { to: '/library', label: 'Reference library', icon: Library, group: 'Plan' },
  { to: '/notes', label: 'Lecture notes', short: 'Notes', icon: FileText, group: 'Teach' },
  { to: '/assessments', label: 'Exams & coursework', icon: ClipboardList, group: 'Assess' },
  { to: '/bank', label: 'Question bank', icon: ListChecks, group: 'Assess' },
  { to: '/students', label: 'Students & marks', short: 'Marks', icon: Users, group: 'Assess' },
  { to: '/solve', label: 'Deep Solve', short: 'Solve', icon: BrainCircuit, group: 'AI' },
  { to: '/research', label: 'Tutor chat & research', icon: Search, group: 'AI' },
  { to: '/knowledge', label: 'Knowledge bases', icon: Database, group: 'AI' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, group: 'App' },
];

const MOBILE_NAV = ['/', '/units', '/notes', '/solve', '/students'];

function routeView(first: string | undefined): React.ReactNode {
  switch (first) {
    case undefined:
      return <HomeView />;
    case 'curriculum':
    case 'programmes':
      return <CurriculumView />;
    case 'units':
    case 'classes':
      return <UnitsView />;
    case 'library':
      return <LibraryView />;
    case 'notes':
      return <NotesView />;
    case 'assessments':
      return <AssessmentsView />;
    case 'bank':
      return <BankView />;
    case 'solve':
      return <SolveView />;
    case 'research':
      return <ResearchView />;
    case 'knowledge':
      return <KnowledgeView />;
    case 'students':
      return <StudentsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return (
        <div className="p-8 text-center text-muted">
          This page does not exist. <a className="text-accent underline underline-offset-2" href="#/">Go home</a>
        </div>
      );
  }
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function SyncBadge() {
  const s = useSyncStatus();
  const online = useOnline();
  const signedIn = !!getSession();
  if (!online)
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-warn/15 px-2.5 py-1 text-xs text-warn" title="Everything keeps working; AI and sync resume when you reconnect.">
        <CloudOff className="h-3.5 w-3.5" /> Offline
      </span>
    );
  if (!signedIn)
    return (
      <a href={href('/settings')} className="flex items-center gap-1.5 rounded-full bg-panel2 px-2.5 py-1 text-xs text-muted hover:text-ink">
        <CloudOff className="h-3.5 w-3.5" /> Sign in for AI & sync
      </a>
    );
  return (
    <button
      onClick={() => void runSync()}
      title={s.lastSynced ? `Last synced ${new Date(s.lastSynced).toLocaleString()}` : 'Sync now'}
      className={cx(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
        s.state === 'error' ? 'bg-bad/15 text-bad' : s.state === 'conflict' ? 'bg-warn/15 text-warn' : 'bg-good/10 text-good',
      )}
    >
      {s.state === 'syncing' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
      <span className="max-w-[12rem] truncate">{s.state === 'syncing' ? 'Syncing…' : s.message || 'Cloud sync on'}</span>
    </button>
  );
}

function JobsTray() {
  const jobs = useJobs();
  const [open, setOpen] = useState(false);
  if (!jobs.length) return null;
  const running = jobs.filter((j) => j.status === 'running');
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={cx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs', running.length ? 'bg-accent/15 text-accent' : 'bg-panel2 text-muted')}>
        {running.length ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {running.length ? `${running.length} AI task${running.length > 1 ? 's' : ''} running` : 'AI tasks finished'}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-line bg-panel p-3 shadow-2xl">
          {jobs.map((j) => (
            <div key={j.id} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between gap-2 text-sm">
                <a href={j.link ? href(j.link) : undefined} className="truncate font-medium hover:text-accent">
                  {j.label}
                </a>
                {j.status === 'running' ? (
                  <button className="text-xs text-muted hover:text-bad" onClick={() => cancelJob(j.id)}>
                    Stop
                  </button>
                ) : (
                  <button className="text-xs text-muted hover:text-ink" onClick={() => dismissJob(j.id)}>
                    Dismiss
                  </button>
                )}
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel2">
                <div className="h-full bg-accent" style={{ width: `${j.total ? (j.done / j.total) * 100 : 100}%` }} />
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted">
                {j.done}/{j.total} · {j.message}
                {j.errors.length > 0 && <span className="text-bad"> · {j.errors.length} problem(s)</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell() {
  const route = useRoute();
  const ws = useWorkspace();
  const saveError = useSaveError();
  const [menu, setMenu] = useState(false);
  const active = '/' + (route.parts[0] ?? '');
  const isActive = (to: string) => (to === '/' ? active === '/' : active === to || (to === '/units' && active === '/classes') || (to === '/curriculum' && active === '/programmes'));

  useEffect(() => {
    setMenu(false);
  }, [route.path]);

  // Theme
  useEffect(() => {
    const apply = () => {
      const dark = ws.settings.theme === 'dark' || (ws.settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('light', !dark);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [ws.settings.theme]);

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5 p-3">
      {NAV.map((item, i) => {
        const Icon = item.icon;
        const showGroup = item.group && item.group !== NAV[i - 1]?.group;
        return (
          <React.Fragment key={item.to}>
            {showGroup && <div className="mt-3 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{item.group}</div>}
            <a
              href={href(item.to)}
              aria-current={isActive(item.to) ? 'page' : undefined}
              className={cx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition', isActive(item.to) ? 'bg-accent/15 font-medium text-accent' : 'text-ink/85 hover:bg-panel2')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </a>
          </React.Fragment>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-full">
      <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-line bg-panel lg:flex">
        <a href="#/" className="flex items-center gap-2 border-b border-line px-5 py-4 no-underline">
          <Sparkles className="h-5 w-5 text-accent" />
          <div>
            <div className="font-bold leading-tight">Deep Tutor Pro</div>
            <div className="text-[10px] text-muted">Version {APP_VERSION}</div>
          </div>
        </a>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      {menu && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenu(false)}>
          <aside className="h-full w-72 overflow-y-auto border-r border-line bg-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-bold">Deep Tutor Pro</span>
              <button aria-label="Close menu" onClick={() => setMenu(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center gap-2 border-b border-line bg-panel/80 px-3 py-2 backdrop-blur sm:px-5">
          <button aria-label="Open menu" className="rounded-md p-1.5 hover:bg-panel2 lg:hidden" onClick={() => setMenu(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold lg:hidden">Deep Tutor Pro</span>
          <button
            onClick={() => window.dispatchEvent(new Event('dtp-open-palette'))}
            className="ml-2 hidden min-w-[16rem] items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-1.5 text-left text-sm text-muted hover:text-ink md:flex"
            aria-label="Search everything (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1">Search…</span>
            <kbd className="rounded border border-line px-1.5 text-[11px]">Ctrl K</kbd>
          </button>
          <button onClick={() => window.dispatchEvent(new Event('dtp-open-palette'))} className="rounded-md p-1.5 hover:bg-panel2 md:hidden" aria-label="Search everything">
            <Search className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <JobsTray />
            <SyncBadge />
          </div>
        </header>
        {saveError && <div className="no-print border-b border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">{saveError}</div>}
        <UpdateBanner />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0" id="main">
          <ErrorBoundary resetKey={route.path}>
            <Suspense fallback={<div className="p-8"><Spinner label="Loading…" /></div>}>{routeView(route.parts[0])}</Suspense>
          </ErrorBoundary>
        </main>
        <nav aria-label="Quick" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-panel lg:hidden">
          {NAV.filter((n) => MOBILE_NAV.includes(n.to)).map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.to} href={href(item.to)} className={cx('flex flex-col items-center gap-0.5 py-2 text-[10px]', isActive(item.to) ? 'text-accent' : 'text-muted')}>
                <Icon className="h-5 w-5" />
                {item.short ?? item.label}
              </a>
            );
          })}
        </nav>
      </div>
      <ConflictDialog />
      <CommandPalette />
    </div>
  );
}

export function App() {
  const [ready, setReady] = useState(store.isLoaded());
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSession();
        await loadWorkspace();
        if (cancelled) return;
        setReady(true);
        await adoptCookieSession();
        onSessionChanged();
      } catch (err) {
        setError((err as Error).message || String(err));
      }
    })();
    const off = onSession(() => onSessionChanged());
    const online = () => void runSync();
    window.addEventListener('online', online);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && store.get().settings.autoSync) void runSync();
    }, 5 * 60_000);
    return () => {
      cancelled = true;
      off();
      window.removeEventListener('online', online);
      clearInterval(timer);
    };
  }, []);

  if (error)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold">Deep Tutor Pro could not open its storage.</p>
        <p className="max-w-md text-sm text-muted">{error}</p>
        <Button onClick={() => location.reload()}>Try again</Button>
      </div>
    );
  if (!ready)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Opening your workspace…" />
      </div>
    );
  return (
    <UiProvider>
      <Shell />
    </UiProvider>
  );
}
