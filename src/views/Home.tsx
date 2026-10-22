import { ArrowRight, BookOpen, BrainCircuit, CheckCircle2, ClipboardList, FileText, GraduationCap, LogIn, MessageSquare, Sparkles, Upload, Users, Wand2 } from 'lucide-react';
import type { Workspace } from '../lib/model';
import { useWorkspace } from '../state/store';
import { getSession } from '../lib/api';
import { sortUnits } from '../lib/curriculum';
import { unitLabel } from '../lib/workspace';
import { href } from '../state/router';
import { A, Card, Empty, LinkButton, Page } from '../ui/kit';
import { MeterList } from '../ui/Charts';
import { formatDate, plural } from '../state/helpers';

interface Step {
  icon: typeof Sparkles;
  title: string;
  detail: string;
  to: string;
  action: string;
}

/** What to do next, worked out from the workspace (most useful first). */
export function nextSteps(ws: Workspace, signedIn: boolean): Step[] {
  const steps: Step[] = [];
  const covered = coveredTopics(ws);
  if (!ws.programmes.length && !ws.units.length)
    steps.push({ icon: GraduationCap, title: 'Import your curriculum', detail: 'Upload the curriculum or teacher’s guide; classes, units, outlines and contact hours are built from it.', to: '/curriculum?import=1', action: 'Import' });
  if (!signedIn) steps.push({ icon: LogIn, title: 'Sign in to switch on AI and sync', detail: 'Notes, exams, Deep Solve and cloud backup need your DeepTutor server.', to: '/settings', action: 'Sign in' });
  const pending = ws.units.filter((u) => !u.analysed);
  if (pending.length) {
    const p = ws.programmes.find((x) => x.id === pending[0].programmeId);
    steps.push({ icon: Wand2, title: `Finish reading ${plural(pending.length, 'unit outline')}`, detail: 'Topics, contact hours and learning objectives have not been extracted yet.', to: p ? `/programmes/${p.id}` : '/units', action: 'Open' });
  }
  const gaps = sortUnits(ws.units)
    .map((u) => ({ u, missing: u.topics.filter((t) => !covered.has(t.id)).length }))
    .filter((x) => x.missing > 0);
  if (gaps.length) {
    const g = gaps[0];
    steps.push({ icon: FileText, title: `Write notes for ${g.u.code || g.u.title}`, detail: `${plural(g.missing, 'topic')} in this unit ${g.missing === 1 ? 'has' : 'have'} no lecture notes${gaps.length > 1 ? `; ${plural(gaps.length - 1, 'other unit')} too` : ''}.`, to: `/units/${g.u.id}?tab=notes`, action: 'Generate' });
  }
  const draftPapers = ws.papers.filter((p) => p.status === 'draft');
  if (draftPapers.length) steps.push({ icon: ClipboardList, title: `Review ${plural(draftPapers.length, 'draft paper')}`, detail: 'Check the questions and marking scheme, then approve as final.', to: `/assessments/${draftPapers[0].id}`, action: 'Review' });
  const draftNotes = ws.notes.filter((n) => n.status === 'draft');
  if (draftNotes.length) steps.push({ icon: CheckCircle2, title: `Approve ${plural(draftNotes.length, 'draft note')}`, detail: 'AI notes stay marked as drafts on exports until you approve them.', to: `/notes/${draftNotes[0].id}`, action: 'Review' });
  if (ws.classes.length && !ws.students.length) steps.push({ icon: Users, title: 'Add your students', detail: 'Import a class list from Excel or CSV, or add students one by one.', to: `/students/class/${ws.classes[0].id}`, action: 'Add' });
  return steps.slice(0, 4);
}

/** Ids of the topics that have at least one lecture note. */
const coveredTopics = (ws: Workspace) => new Set(ws.notes.map((n) => n.topicId));

export default function Home() {
  const ws = useWorkspace();
  const signedIn = !!getSession();
  const steps = nextSteps(ws, signedIn);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = ws.settings.tutorName ? `Welcome back, ${ws.settings.tutorName}` : 'Welcome to Deep Tutor Pro';
  const unitsById = new Map(ws.units.map((u) => [u.id, u]));
  const recent = [
    ...ws.notes.map((n) => ({ id: n.id, kind: 'note' as const, title: n.title, sub: unitsById.get(n.unitId) ? unitLabel(unitsById.get(n.unitId)!) : 'Lecture notes', at: n.updatedAt, to: `/notes/${n.id}` })),
    ...ws.papers.map((p) => ({ id: p.id, kind: 'paper' as const, title: p.title, sub: p.status === 'final' ? 'Approved paper' : 'Draft paper', at: p.updatedAt, to: `/assessments/${p.id}` })),
    ...ws.chats.map((c) => ({ id: c.id, kind: 'chat' as const, title: c.title, sub: c.kind === 'solve' ? 'Deep Solve' : 'Chat', at: c.updatedAt, to: c.kind === 'solve' ? `/solve/${c.id}` : `/research/${c.kind === 'research' ? 'research' : 'chat'}?chat=${c.id}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
  const covered = coveredTopics(ws);
  const coverage = sortUnits(ws.units)
    .filter((u) => u.topics.length)
    .map((u) => ({ id: u.id, label: u.code || u.title, value: (u.topics.filter((t) => covered.has(t.id)).length / u.topics.length) * 100, href: href(`/units/${u.id}`, { tab: 'notes' }), detail: unitLabel(u) }));
  const stats: [string, number, string][] = [
    ['Course units', ws.units.length, '/units'],
    ['Lecture notes', ws.notes.length, '/notes'],
    ['Papers', ws.papers.length, '/assessments'],
    ['Bank questions', ws.bank.length, '/bank'],
    ['Students', ws.students.length, '/students'],
    ['References', ws.references.length, '/library'],
  ];
  const kindIcon = { note: FileText, paper: ClipboardList, chat: MessageSquare };

  return (
    <Page title={greeting} subtitle={`${today}${ws.settings.institution ? ` · ${ws.settings.institution}` : ''}`}>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="next-steps">
          <h2 id="next-steps" className="mb-2 text-sm font-semibold text-muted">
            Next steps
          </h2>
          {steps.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-good/40 bg-good/10 p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-good" />
              All caught up — every topic has notes and every draft is approved.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {steps.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.title}>
                    <a href={`#${s.to}`} className="group flex h-full gap-3 rounded-xl border border-line bg-panel p-4 transition hover:border-accent">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{s.title}</span>
                        <span className="mt-0.5 block text-sm text-muted">{s.detail}</span>
                        <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent">
                          {s.action} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}

          <ul aria-label="Workspace totals" className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {stats.map(([label, n, to]) => (
              <li key={label}>
                <a href={href(to)} className="block rounded-xl border border-line bg-panel px-3 py-2.5 transition hover:border-accent">
                  <span className="block truncate text-[11px] text-muted">{label}</span>
                  <span className="block text-xl font-bold tabular-nums">{n.toLocaleString()}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            <LinkButton to="/curriculum" query={{ import: '1' }} icon={<Upload className="h-4 w-4" />}>
              Curriculum
            </LinkButton>
            <LinkButton to="/library" icon={<BookOpen className="h-4 w-4" />}>
              References
            </LinkButton>
            <LinkButton to="/assessments/new" icon={<ClipboardList className="h-4 w-4" />}>
              New exam
            </LinkButton>
            <LinkButton to="/solve" icon={<BrainCircuit className="h-4 w-4" />}>
              Deep Solve
            </LinkButton>
          </div>
          <p className="mt-3 text-xs text-muted">
            Tip: press <kbd className="rounded border border-line px-1">Ctrl</kbd> + <kbd className="rounded border border-line px-1">K</kbd> to jump to any unit, note, paper or student.
          </p>
        </Card>

        <Card title="Lecture notes coverage" actions={<A to="/notes">All notes</A>} className="lg:col-span-2">
          {coverage.length === 0 ? (
            <Empty icon={<GraduationCap className="h-8 w-8" />} title="No course outlines yet" action={<LinkButton to="/curriculum" query={{ import: '1' }} variant="primary">Import a curriculum</LinkButton>}>
              Once units have topics, this shows how much of each unit already has lecture notes.
            </Empty>
          ) : (
            <MeterList ariaLabel="Share of topics with lecture notes, per course unit" rows={coverage} />
          )}
        </Card>

        <Card title="Recent work">
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Notes, papers and Deep Solve conversations appear here.</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((r) => {
                const Icon = kindIcon[r.kind];
                return (
                  <li key={`${r.kind}-${r.id}`}>
                    <a href={`#${r.to}`} className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-panel2">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{r.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {r.sub} · {formatDate(r.at)}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {ws.classes.length > 0 && (
          <Card title="Classes" actions={<A to="/students">Students & marks</A>} className="lg:col-span-3">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...ws.classes]
                .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name))
                .map((c) => (
                  <li key={c.id}>
                    <a href={href(`/students/class/${c.id}`)} className="flex items-center justify-between gap-2 rounded-lg border border-line p-3 hover:border-accent">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="text-xs text-muted">Year {c.year}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted">{plural(ws.students.filter((s) => s.classId === c.id).length, 'student')}</span>
                    </a>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </div>
    </Page>
  );
}
