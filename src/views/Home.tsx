import { BookOpen, BrainCircuit, ClipboardList, FileText, GraduationCap, Library, Sparkles, Upload, Users } from 'lucide-react';
import { useWorkspace } from '../state/store';
import { getSession } from '../lib/api';
import { sortUnits } from '../lib/curriculum';
import { unitLabel } from '../lib/workspace';
import { A, Badge, Card, Empty, LinkButton, Page, Stat } from '../ui/kit';
import { formatDate, plural } from '../state/helpers';

export default function Home() {
  const ws = useWorkspace();
  const signedIn = !!getSession();
  const greeting = ws.settings.tutorName ? `Welcome back, ${ws.settings.tutorName}` : 'Welcome to Deep Tutor Pro';
  const recentNotes = [...ws.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentPapers = [...ws.papers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const unitsById = new Map(ws.units.map((u) => [u.id, u]));
  const pendingUnits = ws.units.filter((u) => !u.analysed).length;
  const topicsWithoutNotes = ws.units.reduce((n, u) => n + u.topics.filter((t) => !ws.notes.some((x) => x.topicId === t.id)).length, 0);

  const steps = [
    { done: ws.programmes.length > 0, label: 'Import a curriculum or teacher’s guide', to: '/curriculum', icon: GraduationCap },
    { done: ws.references.some((r) => r.category !== 'curriculum'), label: 'Upload reference books, guidelines or past papers', to: '/library', icon: Upload },
    { done: ws.notes.length > 0, label: 'Generate lecture notes by contact hours', to: '/notes', icon: FileText },
    { done: ws.papers.length > 0, label: 'Set an exam, CAT or assignment with a marking scheme', to: '/assessments', icon: ClipboardList },
    { done: ws.students.length > 0, label: 'Add students and record marks', to: '/students', icon: Users },
  ];

  return (
    <Page title={greeting} subtitle="Plan, teach and assess a whole programme — from the curriculum to the marks sheet.">
      {!signedIn && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <span>
            <Sparkles className="mr-1.5 inline h-4 w-4 text-accent" />
            Sign in to your DeepTutor server to switch on AI (curriculum analysis, notes, exams, Deep Solve) and cloud sync. Everything else already works offline.
          </span>
          <LinkButton to="/settings" variant="primary" size="sm">
            Sign in
          </LinkButton>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Programmes" value={ws.programmes.length} to="/curriculum" />
        <Stat label="Course units" value={ws.units.length} to="/units" hint={pendingUnits ? `${pendingUnits} to analyse` : undefined} />
        <Stat label="Lecture notes" value={ws.notes.length} to="/notes" hint={topicsWithoutNotes ? `${topicsWithoutNotes} topics without notes` : undefined} />
        <Stat label="Exams & coursework" value={ws.papers.length} to="/assessments" />
        <Stat label="Question bank" value={ws.bank.length} to="/bank" />
        <Stat label="Students" value={ws.students.length} to="/students" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Getting started" className="lg:col-span-1">
          <ol className="space-y-2.5">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.to}>
                  <a href={`#${s.to}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-panel2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? 'bg-good/20 text-good' : 'bg-panel2 text-muted'}`}>{s.done ? '✓' : i + 1}</span>
                    <Icon className="h-4 w-4 shrink-0 text-muted" />
                    <span className={`text-sm ${s.done ? 'text-muted line-through' : ''}`}>{s.label}</span>
                  </a>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <LinkButton to="/solve" icon={<BrainCircuit className="h-4 w-4" />}>
              Deep Solve
            </LinkButton>
            <LinkButton to="/library" icon={<Library className="h-4 w-4" />}>
              Library
            </LinkButton>
          </div>
        </Card>

        <Card title="Programmes" className="lg:col-span-2" actions={<LinkButton size="sm" to="/curriculum" query={{ import: '1' }} variant="primary" icon={<Upload className="h-3.5 w-3.5" />}>Import curriculum</LinkButton>}>
          {ws.programmes.length === 0 ? (
            <Empty icon={<GraduationCap className="h-8 w-8" />} title="No curriculum yet">
              Upload a curriculum or teacher’s guide (PDF, Word, scanned pages or photos). Deep Tutor Pro reads it and builds the classes, course units, outlines, objectives and contact hours for you.
            </Empty>
          ) : (
            <div className="space-y-3">
              {ws.programmes.map((p) => {
                const units = sortUnits(ws.units.filter((u) => u.programmeId === p.id));
                const years = [...new Set(units.map((u) => u.year))].sort((a, b) => a - b);
                return (
                  <div key={p.id} className="rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <A to={`/programmes/${p.id}`} className="font-semibold">
                        {p.title}
                      </A>
                      <span className="text-xs text-muted">
                        {plural(units.length, 'unit')} · {p.durationYears} year{p.durationYears === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {years.map((y) => (
                        <a key={y} href={`#/units?programme=${p.id}&year=${y}`} className="rounded-full bg-panel2 px-2.5 py-0.5 text-xs hover:text-accent">
                          Year {y}: {units.filter((u) => u.year === y).length} units
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Recent lecture notes" className="lg:col-span-1" actions={<A to="/notes">All notes</A>}>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted">Notes you generate or write appear here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentNotes.map((n) => (
                <li key={n.id} className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <A to={`/notes/${n.id}`} className="block truncate">
                      {n.title}
                    </A>
                    <div className="truncate text-xs text-muted">{unitsById.get(n.unitId) ? unitLabel(unitsById.get(n.unitId)!) : 'No unit'} · {formatDate(n.updatedAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent exams & coursework" className="lg:col-span-1" actions={<A to="/assessments">All</A>}>
          {recentPapers.length === 0 ? (
            <p className="text-sm text-muted">Exams, CATs and assignments you set appear here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentPapers.map((p) => (
                <li key={p.id} className="flex items-start gap-2">
                  <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <A to={`/assessments/${p.id}`} className="block truncate">
                      {p.title}
                    </A>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Badge tone={p.status === 'final' ? 'good' : 'warn'}>{p.status}</Badge>
                      {formatDate(p.updatedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Classes" className="lg:col-span-1" actions={<A to="/students">Students & marks</A>}>
          {ws.classes.length === 0 ? (
            <p className="text-sm text-muted">Classes are created for each year of study when you import a curriculum, or add them yourself.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {[...ws.classes]
                .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name))
                .slice(0, 8)
                .map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <A to={`/students/class/${c.id}`} className="truncate">
                      <BookOpen className="mr-1.5 inline h-3.5 w-3.5" />
                      {c.name}
                    </A>
                    <span className="shrink-0 text-xs text-muted">{plural(ws.students.filter((s) => s.classId === c.id).length, 'student')}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
