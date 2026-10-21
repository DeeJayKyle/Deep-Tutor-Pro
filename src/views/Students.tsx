import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, GraduationCap, Plus, Search, Trash2, Upload, UserPlus, Users } from 'lucide-react';
import type { ClassGroup, MarkEntry, Student, StudentStatus, Unit } from '../lib/model';
import { exportDocument, exportXlsx, readXlsxRows, saveBlob, fileName } from '../lib/exporters';
import { gpa, parseScore, rank, stats, unitResult } from '../lib/grading';
import { parseCsv, parseRoster } from '../lib/roster';
import { sortUnits } from '../lib/curriculum';
import { fullName, normStudent, now, uid, unitLabel } from '../lib/workspace';
import { navigate, useRoute } from '../state/router';
import { patch, remove, update, upsert, useWorkspace } from '../state/store';
import { docMeta, plural } from '../state/helpers';
import { A, Badge, Button, Card, EditableText, Empty, Field, FileButton, Input, LinkButton, Modal, Page, Select, Stat, Tabs, Textarea, cx, useAction, useUi } from '../ui/kit';

const STATUSES: StudentStatus[] = ['Active', 'Suspended', 'Deferred', 'Discontinued', 'Completed', 'Graduated'];

export default function StudentsView() {
  const route = useRoute();
  const [a, b, c] = route.parts.slice(1);
  if (a === 'class' && b && c === 'marks') return <MarksSheet classId={b} />;
  if (a === 'class' && b) return <ClassPage id={b} />;
  if (a && a !== 'class') return <StudentPage id={a} />;
  return <Overview />;
}

function unitsForClass(units: Unit[], cls: ClassGroup): Unit[] {
  return sortUnits(units.filter((u) => u.year === cls.year && (!cls.programmeId || !u.programmeId || u.programmeId === cls.programmeId)));
}

function newClass(year = 1, programmeId?: string): ClassGroup {
  return { id: uid('cl-'), programmeId, name: `Year ${year} class`, year, intake: String(new Date().getFullYear()), academicYear: '', notes: '', createdAt: now() };
}

// ---------------------------------------------------------------- Overview --

function Overview() {
  const ws = useWorkspace();
  const route = useRoute();
  const [q, setQ] = useState('');
  const forUnit = ws.units.find((u) => u.id === route.query.get('unit'));
  const years = [...new Set(ws.classes.map((c) => c.year))].sort((a, b) => a - b);
  const found = q.trim()
    ? ws.students.filter((s) => `${fullName(s)} ${s.regNo} ${s.phone} ${s.email}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30)
    : [];
  return (
    <Page
      title="Students & marks"
      subtitle="Students are kept per class and year of study, with full biodata and marks for every course unit — coursework, assignments and exams."
      actions={
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            const c = { ...newClass(1, ws.programmes[0]?.id), academicYear: ws.settings.academicYear };
            upsert('classes', c);
            navigate(`/students/class/${c.id}`);
          }}
        >
          Add class
        </Button>
      }
    >
      {forUnit && (
        <Card className="mb-4" title={`Record marks for ${unitLabel(forUnit)}`}>
          <div className="flex flex-wrap gap-2">
            {ws.classes
              .filter((c) => c.year === forUnit.year)
              .map((c) => (
                <LinkButton key={c.id} variant="primary" to={`/students/class/${c.id}/marks`} query={{ unit: forUnit.id }}>
                  {c.name}
                </LinkButton>
              ))}
            {!ws.classes.some((c) => c.year === forUnit.year) && <p className="text-sm text-muted">No Year {forUnit.year} class yet — add one first.</p>}
          </div>
        </Card>
      )}
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <Input className="pl-9" placeholder="Find a student by name, reg. no., phone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a student" />
      </div>
      {found.length > 0 && (
        <Card className="mb-5" padded={false}>
          <ul className="divide-y divide-line">
            {found.map((s) => {
              const cls = ws.classes.find((c) => c.id === s.classId);
              return (
                <li key={s.id}>
                  <a href={`#/students/${s.id}`} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm hover:bg-panel2">
                    <span className="w-32 font-mono text-xs text-muted">{s.regNo || '—'}</span>
                    <span className="flex-1">{fullName(s)}</span>
                    <span className="text-xs text-muted">{cls?.name ?? 'No class'}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {ws.classes.length === 0 ? (
        <Empty icon={<Users className="h-8 w-8" />} title="No classes yet" action={<LinkButton to="/curriculum" variant="primary">Import a curriculum</LinkButton>}>
          Importing a curriculum creates one class per year of study. You can also add classes yourself.
        </Empty>
      ) : (
        years.map((y) => (
          <section key={y} className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">Year {y}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ws.classes
                .filter((c) => c.year === y)
                .map((c) => {
                  const students = ws.students.filter((s) => s.classId === c.id);
                  const units = unitsForClass(ws.units, c);
                  return (
                    <Card key={c.id} title={<A to={`/students/class/${c.id}`}>{c.name}</A>} actions={<Badge>{c.academicYear || ws.settings.academicYear}</Badge>}>
                      <div className="mb-3 flex gap-4 text-sm">
                        <span>
                          <strong>{students.length}</strong> <span className="text-muted">{students.length === 1 ? 'student' : 'students'}</span>
                        </span>
                        <span>
                          <strong>{units.length}</strong> <span className="text-muted">{units.length === 1 ? 'unit' : 'units'}</span>
                        </span>
                        {c.intake && <span className="text-muted">Intake {c.intake}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <LinkButton size="sm" to={`/students/class/${c.id}`}>
                          Students
                        </LinkButton>
                        <LinkButton size="sm" to={`/students/class/${c.id}/marks`}>
                          Marks
                        </LinkButton>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </section>
        ))
      )}
      {ws.students.some((s) => !ws.classes.some((c) => c.id === s.classId)) && (
        <Card title="Students without a class">
          <ul className="space-y-1 text-sm">
            {ws.students
              .filter((s) => !ws.classes.some((c) => c.id === s.classId))
              .map((s) => (
                <li key={s.id}>
                  <A to={`/students/${s.id}`}>{fullName(s)}</A>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </Page>
  );
}

// ------------------------------------------------------------- Class page --

function ClassPage({ id }: { id: string }) {
  const ws = useWorkspace();
  const { toast, confirm } = useUi();
  const { busy, run } = useAction();
  const [tab, setTab] = useState<'students' | 'results' | 'details'>('students');
  const [q, setQ] = useState('');
  const [importRows, setImportRows] = useState<ReturnType<typeof parseRoster> | null>(null);
  const cls = ws.classes.find((c) => c.id === id);
  if (!cls)
    return (
      <Page title="Class not found" back={{ to: '/students', label: 'Students' }}>
        <Empty title="This class was deleted or has not synced to this device yet." />
      </Page>
    );
  const students = ws.students.filter((s) => s.classId === cls.id).sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  const shown = students.filter((s) => !q || `${fullName(s)} ${s.regNo}`.toLowerCase().includes(q.toLowerCase()));
  const units = unitsForClass(ws.units, cls);
  const set = (c: Partial<ClassGroup>) => patch('classes', cls.id, c);

  const addStudent = () => {
    const s = normStudent({ id: uid('st-'), classId: cls.id, admissionDate: new Date().toISOString().slice(0, 10) });
    upsert('students', s);
    navigate(`/students/${s.id}`);
  };

  const readRoster = (file: File) =>
    run('import', async () => {
      const rows = /\.xlsx?$/i.test(file.name) ? await readXlsxRows(file) : parseCsv(await file.text());
      const parsed = parseRoster(rows);
      if (!parsed.rows.length) throw new Error('No students were found. The first row must hold column names such as “Reg No”, “Name”, “Gender”.');
      setImportRows(parsed);
    });

  const applyImport = () => {
    if (!importRows) return;
    const t = now();
    let added = 0;
    let updated = 0;
    update((w) => {
      const list = [...w.students];
      for (const r of importRows.rows) {
        const reg = r.values.regNo?.trim().toLowerCase();
        const i = reg ? list.findIndex((s) => s.regNo.trim().toLowerCase() === reg) : -1;
        if (i >= 0) {
          list[i] = { ...list[i], ...r.values, classId: cls.id, updatedAt: t };
          updated += 1;
        } else {
          list.push(normStudent({ ...r.values, id: uid('st-'), classId: cls.id }));
          added += 1;
        }
      }
      return { ...w, students: list };
    });
    setImportRows(null);
    toast(`${added} added, ${updated} updated`);
  };

  const exportRoster = () =>
    run('export', async () => {
      const blob = await exportXlsx(
        [
          {
            name: 'Students',
            columns: [
              { header: 'Reg No', key: 'regNo', width: 18 },
              { header: 'Last name', key: 'lastName', width: 16 },
              { header: 'First name', key: 'firstName', width: 16 },
              { header: 'Other names', key: 'otherNames', width: 16 },
              { header: 'Gender', key: 'gender' },
              { header: 'Date of birth', key: 'dateOfBirth', width: 14 },
              { header: 'National ID', key: 'nationalId', width: 16 },
              { header: 'Phone', key: 'phone', width: 16 },
              { header: 'Email', key: 'email', width: 24 },
              { header: 'Address', key: 'address', width: 22 },
              { header: 'Nationality', key: 'nationality' },
              { header: 'Guardian', key: 'guardianName', width: 20 },
              { header: 'Guardian phone', key: 'guardianPhone', width: 16 },
              { header: 'Relationship', key: 'guardianRelation' },
              { header: 'Admission date', key: 'admissionDate', width: 14 },
              { header: 'Sponsorship', key: 'sponsorship' },
              { header: 'Status', key: 'status' },
            ],
            rows: students.map((s) => ({ ...s })) as unknown as Record<string, string>[],
          },
        ],
        { author: ws.settings.tutorName },
      );
      const res = await saveBlob(blob, fileName(`${cls.name} students`, 'xlsx'));
      if (res.saved) toast(`Saved ${res.name}`);
    });

  return (
    <Page
      back={{ to: '/students', label: 'Students & marks' }}
      title={<EditableText value={cls.name} onCommit={(v) => v.trim() && set({ name: v.trim() })} ariaLabel="Class name" className="!border-transparent !bg-transparent !px-0 text-xl font-bold sm:text-2xl" />}
      subtitle={`Year ${cls.year} · ${plural(students.length, 'student')} · ${plural(units.length, 'course unit')}${cls.intake ? ` · Intake ${cls.intake}` : ''}`}
      actions={
        <>
          <LinkButton to={`/students/class/${cls.id}/marks`} variant="primary" icon={<FileSpreadsheet className="h-4 w-4" />}>
            Enter marks
          </LinkButton>
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={addStudent}>
            Add student
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'students', label: 'Students', count: students.length },
          { id: 'results', label: 'Results summary' },
          { id: 'details', label: 'Class details' },
        ]}
      />
      {tab === 'students' && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input className="pl-9" placeholder="Search this class" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search class" />
            </div>
            <FileButton accept=".csv,.xlsx,.txt" icon={<Upload className="h-4 w-4" />} onFiles={(f) => void readRoster(f[0])} disabled={busy === 'import'}>
              Import list (Excel/CSV)
            </FileButton>
            <Button icon={<Download className="h-4 w-4" />} busy={busy === 'export'} onClick={() => void exportRoster()} disabled={!students.length}>
              Export
            </Button>
          </div>
          {students.length === 0 ? (
            <Empty icon={<Users className="h-8 w-8" />} title="No students in this class" action={<Button variant="primary" onClick={addStudent}>Add a student</Button>}>
              Add students one by one, or import a class list from Excel or CSV with columns like Reg No, Name, Gender, Phone, Guardian.
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-panel2 text-left text-xs text-muted">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Reg. no.</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Gender</th>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s, i) => (
                    <tr key={s.id} className="border-t border-line hover:bg-panel2/60">
                      <td className="p-2.5 text-muted">{i + 1}</td>
                      <td className="p-2.5 font-mono text-xs">{s.regNo || '—'}</td>
                      <td className="p-2.5">
                        <A to={`/students/${s.id}`}>{fullName(s)}</A>
                      </td>
                      <td className="p-2.5">{s.gender || '—'}</td>
                      <td className="p-2.5">{s.phone || '—'}</td>
                      <td className="p-2.5">
                        <Badge tone={s.status === 'Active' ? 'good' : 'warn'}>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {tab === 'results' && <ClassResults cls={cls} students={students} units={units} />}
      {tab === 'details' && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Year of study">
              <EditableText type="number" value={String(cls.year)} onCommit={(v) => set({ year: Math.max(1, Number(v) || 1) })} />
            </Field>
            <Field label="Intake / cohort">
              <EditableText value={cls.intake} onCommit={(v) => set({ intake: v })} />
            </Field>
            <Field label="Academic year">
              <EditableText value={cls.academicYear} placeholder={ws.settings.academicYear} onCommit={(v) => set({ academicYear: v })} />
            </Field>
            <Field label="Programme">
              <Select value={cls.programmeId ?? ''} onChange={(e) => set({ programmeId: e.target.value || undefined })}>
                <option value="">None</option>
                {ws.programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-4">
              <EditableText multiline value={cls.notes} onCommit={(v) => set({ notes: v })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const next = { ...newClass(cls.year + 1, cls.programmeId), name: cls.name.replace(/Year\s*\d+/i, `Year ${cls.year + 1}`), intake: cls.intake, academicYear: '' };
                if (next.name === cls.name) next.name = `${cls.name} (Year ${cls.year + 1})`;
                upsert('classes', next);
                update((w) => ({ ...w, students: w.students.map((s) => (s.classId === cls.id && s.status === 'Active' ? { ...s, classId: next.id, updatedAt: now() } : s)) }));
                toast(`Active students promoted to ${next.name}. Their earlier marks are kept.`);
                navigate(`/students/class/${next.id}`);
              }}
            >
              Promote active students to Year {cls.year + 1}
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={async () => {
                if (!(await confirm(`Delete ${cls.name}?`, { danger: true, ok: 'Delete class', detail: 'Students and their marks are kept; they will have no class until you move them.' }))) return;
                remove('classes', cls.id);
                navigate('/students');
              }}
            >
              Delete class
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={!!importRows}
        wide
        onClose={() => setImportRows(null)}
        title={`Import ${plural(importRows?.rows.length ?? 0, 'student')} into ${cls.name}`}
        footer={
          <>
            <Button onClick={() => setImportRows(null)}>Cancel</Button>
            <Button variant="primary" onClick={applyImport}>
              Import
            </Button>
          </>
        }
      >
        {importRows && (
          <>
            <p className="mb-2 text-xs text-muted">Students with a registration number already in the workspace are updated instead of duplicated.{importRows.unknownHeaders.length ? ` Ignored columns: ${importRows.unknownHeaders.join(', ')}.` : ''}</p>
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="p-1">Reg. no.</th>
                    <th className="p-1">Name</th>
                    <th className="p-1">Gender</th>
                    <th className="p-1">Phone</th>
                    <th className="p-1">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.rows.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="p-1">{r.values.regNo}</td>
                      <td className="p-1">{fullName({ firstName: r.values.firstName ?? '', lastName: r.values.lastName ?? '', otherNames: r.values.otherNames ?? '' })}</td>
                      <td className="p-1">{r.values.gender}</td>
                      <td className="p-1">{r.values.phone}</td>
                      <td className={cx('p-1', r.problems.length && 'text-warn')}>{r.problems.join(', ') || 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </Page>
  );
}

function ClassResults({ cls, students, units }: { cls: ClassGroup; students: Student[]; units: Unit[] }) {
  const ws = useWorkspace();
  const { components, bands, passMark } = ws.settings;
  const { toast } = useUi();
  const { busy, run } = useAction();
  const rows = students.map((s) => {
    const results = units.map((u) => ({ unit: u, result: unitResult(ws.marks, s.id, u.id, components, bands, passMark) }));
    const finals = results.map((r) => r.result.weighted).filter((x): x is number => x !== null);
    return { s, results, mean: finals.length ? Math.round((finals.reduce((a, b) => a + b, 0) / finals.length) * 10) / 10 : null, gpa: gpa(results), fails: results.filter((r) => r.result.passed === false).length };
  });
  const ranks = rank(rows.map((r) => ({ id: r.s.id, value: r.mean })));
  const exportResults = () =>
    run('export', async () => {
      const blob = await exportXlsx([
        {
          name: 'Results',
          columns: [
            { header: 'Reg No', key: 'reg', width: 18 },
            { header: 'Name', key: 'name', width: 28 },
            ...units.map((u) => ({ header: u.code || u.title.slice(0, 20), key: u.id, width: 12 })),
            { header: 'Average', key: 'mean' },
            { header: 'GPA', key: 'gpa' },
            { header: 'Position', key: 'pos' },
            { header: 'Failed units', key: 'fails' },
          ],
          rows: rows.map((r) => ({ reg: r.s.regNo, name: fullName(r.s), ...Object.fromEntries(r.results.map((x) => [x.unit.id, x.result.weighted === null ? '' : `${x.result.weighted} (${x.result.grade})`])), mean: r.mean, gpa: r.gpa, pos: ranks[r.s.id], fails: r.fails })),
          notes: [`${cls.name} — ${cls.academicYear || ws.settings.academicYear}. Pass mark ${passMark}%. Weights: ${components.map((c) => `${c.name} ${c.weight}%`).join(', ')}.`],
        },
      ]);
      const res = await saveBlob(blob, fileName(`${cls.name} results`, 'xlsx'));
      if (res.saved) toast(`Saved ${res.name}`);
    });
  if (!units.length) return <Empty title={`No Year ${cls.year} course units`}>Results appear once the class has units and marks.</Empty>;
  return (
    <Card title="Final marks per unit" actions={<Button size="sm" icon={<Download className="h-3.5 w-3.5" />} busy={busy === 'export'} onClick={() => void exportResults()}>Export Excel</Button>} padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-panel2 text-left text-xs text-muted">
            <tr>
              <th className="p-2">Student</th>
              {units.map((u) => (
                <th key={u.id} className="p-2">
                  <A to={`/students/class/${cls.id}/marks`} query={{ unit: u.id }}>
                    {u.code || u.title.slice(0, 14)}
                  </A>
                </th>
              ))}
              <th className="p-2">Average</th>
              <th className="p-2">GPA</th>
              <th className="p-2">Pos.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id} className="border-t border-line">
                <td className="p-2">
                  <A to={`/students/${r.s.id}`}>{fullName(r.s)}</A>
                </td>
                {r.results.map((x) => (
                  <td key={x.unit.id} className={cx('p-2', x.result.passed === false && 'text-bad')}>
                    {x.result.weighted === null ? <span className="text-muted">—</span> : `${x.result.weighted} ${x.result.grade}`}
                  </td>
                ))}
                <td className="p-2 font-semibold">{r.mean ?? '—'}</td>
                <td className="p-2">{r.gpa ?? '—'}</td>
                <td className="p-2">{ranks[r.s.id] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// -------------------------------------------------------------- Marks sheet --

function MarksSheet({ classId }: { classId: string }) {
  const ws = useWorkspace();
  const route = useRoute();
  const { toast } = useUi();
  const { busy, run } = useAction();
  const cls = ws.classes.find((c) => c.id === classId);
  const units = cls ? unitsForClass(ws.units, cls) : [];
  const allUnits = sortUnits(ws.units);
  const unitId = route.query.get('unit') ?? units[0]?.id ?? '';
  const unit = ws.units.find((u) => u.id === unitId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { components, bands, passMark } = ws.settings;
  const students = useMemo(() => (cls ? ws.students.filter((s) => s.classId === cls.id).sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)) : []), [ws.students, cls]);
  if (!cls)
    return (
      <Page title="Class not found" back={{ to: '/students', label: 'Students' }}>
        <Empty title="This class was deleted." />
      </Page>
    );
  const results = unit ? students.map((s) => ({ s, r: unitResult(ws.marks, s.id, unit.id, components, bands, passMark) })) : [];
  const ranks = rank(results.map((x) => ({ id: x.s.id, value: x.r.weighted })));
  const st = stats(results.map((x) => x.r.weighted), passMark);
  const weightSum = components.reduce((s, c) => s + c.weight, 0);

  const setScore = (studentId: string, componentId: string, input: string) => {
    const comp = components.find((c) => c.id === componentId)!;
    const key = `${studentId}|${componentId}`;
    const parsed = parseScore(input, comp.maxScore);
    if (!parsed.ok) {
      setErrors((e) => ({ ...e, [key]: parsed.error }));
      return;
    }
    setErrors((e) => {
      const { [key]: _drop, ...rest } = e;
      return rest;
    });
    update((w) => {
      const i = w.marks.findIndex((m) => m.studentId === studentId && m.unitId === unitId && m.componentId === componentId);
      const t = now();
      if (i >= 0) return { ...w, marks: w.marks.map((m, j) => (j === i ? { ...m, score: parsed.value, updatedAt: t } : m)) };
      if (parsed.value === null) return w;
      const entry: MarkEntry = { id: uid('m-'), studentId, unitId, componentId, score: parsed.value, remark: '', updatedAt: t };
      return { ...w, marks: [...w.marks, entry] };
    });
  };

  const exportSheet = () =>
    run('export', async () => {
      if (!unit) return;
      const blob = await exportXlsx([
        {
          name: unit.code || 'Marks',
          columns: [
            { header: 'Reg No', key: 'reg', width: 18 },
            { header: 'Name', key: 'name', width: 28 },
            ...components.map((c) => ({ header: `${c.name} (/${c.maxScore})`, key: c.id, width: 14 })),
            { header: 'Final %', key: 'final' },
            { header: 'Grade', key: 'grade' },
            { header: 'Remark', key: 'remark', width: 16 },
            { header: 'Position', key: 'pos' },
          ],
          rows: results.map(({ s, r }) => ({ reg: s.regNo, name: fullName(s), ...Object.fromEntries(components.map((c) => [c.id, r.scores[c.id] ?? ''])), final: r.weighted, grade: r.grade, remark: r.remark, pos: ranks[s.id] })),
          notes: [
            `${unitLabel(unit)} — ${cls.name}, ${cls.academicYear || ws.settings.academicYear}`,
            `Weights: ${components.map((c) => `${c.name} ${c.weight}%`).join(', ')}. Pass mark ${passMark}%.`,
            `Class mean ${st.mean ?? '—'}, median ${st.median ?? '—'}, pass rate ${st.passRate ?? '—'}%.`,
          ],
        },
      ]);
      const res = await saveBlob(blob, fileName(`${unit.code || unit.title} ${cls.name} marks`, 'xlsx'));
      if (res.saved) toast(`Saved ${res.name}`);
    });

  const importSheet = (file: File) =>
    run('import', async () => {
      if (!unit) return;
      const rows = /\.xlsx?$/i.test(file.name) ? await readXlsxRows(file) : parseCsv(await file.text());
      const [head, ...body] = rows;
      if (!head) throw new Error('The file is empty.');
      const regCol = head.findIndex((h) => /reg|adm|index/i.test(h));
      if (regCol < 0) throw new Error('The sheet needs a “Reg No” column to match students.');
      const colFor = components.map((c) => head.findIndex((h) => h.toLowerCase().startsWith(c.name.toLowerCase())));
      let n = 0;
      const t = now();
      update((w) => {
        const marks = [...w.marks];
        for (const r of body) {
          const s = students.find((x) => x.regNo.trim().toLowerCase() === (r[regCol] ?? '').trim().toLowerCase());
          if (!s) continue;
          components.forEach((c, k) => {
            const col = colFor[k];
            if (col < 0 || r[col] === undefined || r[col] === '') return;
            const parsed = parseScore(r[col], c.maxScore);
            if (!parsed.ok) return;
            const i = marks.findIndex((m) => m.studentId === s.id && m.unitId === unit.id && m.componentId === c.id);
            if (i >= 0) marks[i] = { ...marks[i], score: parsed.value, updatedAt: t };
            else marks.push({ id: uid('m-'), studentId: s.id, unitId: unit.id, componentId: c.id, score: parsed.value, remark: '', updatedAt: t });
            n += 1;
          });
        }
        return { ...w, marks };
      });
      toast(`${n} marks imported`);
    });

  return (
    <Page
      back={{ to: `/students/class/${cls.id}`, label: cls.name }}
      title="Marks sheet"
      subtitle={
        <>
          {cls.name} · {cls.academicYear || ws.settings.academicYear} · weights: {components.map((c) => `${c.name} ${c.weight}%`).join(', ')}
          {weightSum !== 100 && <span className="text-warn"> (weights add to {weightSum}%, results are scaled)</span>} · <A to="/settings" query={{ tab: 'grading' }}>change</A>
        </>
      }
      actions={
        unit && (
          <>
            <FileButton accept=".xlsx,.csv" icon={<Upload className="h-4 w-4" />} onFiles={(f) => void importSheet(f[0])} disabled={busy === 'import'}>
              Import
            </FileButton>
            <Button icon={<Download className="h-4 w-4" />} busy={busy === 'export'} onClick={() => void exportSheet()}>
              Export Excel
            </Button>
          </>
        )
      }
    >
      <div className="mb-4 max-w-xl">
        <Field label="Course unit">
          <Select value={unitId} onChange={(e) => navigate(`/students/class/${cls.id}/marks`, { unit: e.target.value }, true)}>
            <optgroup label={`Year ${cls.year}`}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitLabel(u)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Other units">
              {allUnits
                .filter((u) => !units.includes(u))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {unitLabel(u)}
                  </option>
                ))}
            </optgroup>
          </Select>
        </Field>
      </div>
      {!unit ? (
        <Empty title="No course units">Add units for this year first.</Empty>
      ) : students.length === 0 ? (
        <Empty title="No students in this class" action={<LinkButton to={`/students/class/${cls.id}`} variant="primary">Add students</LinkButton>} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Stat label="Marked" value={`${st.count}/${students.length}`} />
            <Stat label="Mean" value={st.mean ?? '—'} />
            <Stat label="Median" value={st.median ?? '—'} />
            <Stat label="Highest" value={st.max ?? '—'} />
            <Stat label="Lowest" value={st.min ?? '—'} />
            <Stat label="Pass rate" value={st.passRate === null ? '—' : `${st.passRate}%`} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-panel2 text-left text-xs text-muted">
                <tr>
                  <th className="sticky left-0 bg-panel2 p-2">Student</th>
                  {components.map((c) => (
                    <th key={c.id} className="p-2">
                      {c.name}
                      <div className="font-normal">
                        /{c.maxScore} · {c.weight}%
                      </div>
                    </th>
                  ))}
                  <th className="p-2">Final %</th>
                  <th className="p-2">Grade</th>
                  <th className="p-2">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ s, r }) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="sticky left-0 bg-panel p-2">
                      <A to={`/students/${s.id}`}>{fullName(s)}</A>
                      <div className="font-mono text-[10px] text-muted">{s.regNo}</div>
                    </td>
                    {components.map((c) => {
                      const key = `${s.id}|${c.id}`;
                      return (
                        <td key={c.id} className="p-1.5">
                          <ScoreInput value={r.scores[c.id]} label={`${c.name} for ${fullName(s)}`} error={errors[key]} onCommit={(v) => setScore(s.id, c.id, v)} />
                        </td>
                      );
                    })}
                    <td className={cx('p-2 font-semibold', r.passed === false && 'text-bad')}>{r.weighted ?? '—'}</td>
                    <td className="p-2">{r.grade ? <span title={r.remark}>{r.grade}</span> : '—'}</td>
                    <td className="p-2">{ranks[s.id] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Marks save as you type them (press Tab or Enter to move on). Empty cells mean “not yet marked”, not zero.</p>
        </>
      )}
    </Page>
  );
}

function ScoreInput({ value, onCommit, label, error }: { value: number | null | undefined; onCommit: (v: string) => void; label: string; error?: string }) {
  const text = value === null || value === undefined ? '' : String(value);
  const [draft, setDraft] = useState(text);
  const [last, setLast] = useState(text);
  if (text !== last) {
    setLast(text);
    setDraft(text);
  }
  return (
    <div>
      <input
        aria-label={label}
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== text && onCommit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={cx('w-20 rounded-md border bg-panel2 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30', error ? 'border-bad' : 'border-line')}
      />
      {error && <div className="text-[10px] text-bad">{error}</div>}
    </div>
  );
}

// ------------------------------------------------------------- Student page --

function StudentPage({ id }: { id: string }) {
  const ws = useWorkspace();
  const { toast, confirm } = useUi();
  const { busy, run } = useAction();
  const s = ws.students.find((x) => x.id === id);
  if (!s)
    return (
      <Page title="Student not found" back={{ to: '/students', label: 'Students' }}>
        <Empty title="This student was deleted or has not synced to this device yet." />
      </Page>
    );
  const cls = ws.classes.find((c) => c.id === s.classId);
  const set = (c: Partial<Student>) => patch('students', s.id, c);
  const { components, bands, passMark } = ws.settings;
  const markedUnitIds = new Set(ws.marks.filter((m) => m.studentId === s.id).map((m) => m.unitId));
  const unitsWithMarks = sortUnits(ws.units.filter((u) => markedUnitIds.has(u.id) || (cls && u.year === cls.year)));
  const years = [...new Set(unitsWithMarks.map((u) => u.year))].sort((a, b) => a - b);
  const byYear = years.map((y) => {
    const results = unitsWithMarks.filter((u) => u.year === y).map((unit) => ({ unit, result: unitResult(ws.marks, s.id, unit.id, components, bands, passMark) }));
    return { year: y, results, gpa: gpa(results) };
  });
  const overall = gpa(byYear.flatMap((y) => y.results));

  const transcript = () =>
    run('transcript', async () => {
      const lines = [
        '| | |',
        '|---|---|',
        `| Name | ${fullName(s)} |`,
        `| Registration no. | ${s.regNo || '—'} |`,
        `| Class | ${cls?.name ?? '—'} |`,
        `| Status | ${s.status} |`,
        '',
      ];
      for (const y of byYear) {
        lines.push(`## Year ${y.year}`, '', `| Code | Course unit | ${components.map((c) => c.name).join(' | ')} | Final % | Grade |`, `|${'---|'.repeat(components.length + 4)}`);
        for (const { unit, result } of y.results) lines.push(`| ${unit.code} | ${unit.title} | ${components.map((c) => result.scores[c.id] ?? '—').join(' | ')} | ${result.weighted ?? '—'} | ${result.grade || '—'} |`);
        lines.push('', `**Year ${y.year} GPA:** ${y.gpa ?? '—'}`, '');
      }
      lines.push(`**Cumulative GPA:** ${overall ?? '—'}`);
      const res = await exportDocument('pdf', lines.join('\n'), docMeta(ws, `Academic transcript — ${fullName(s)}`, cls?.name ?? '', 'final', false));
      if (res.saved) toast(`Saved ${res.name}`);
    });

  const field = (label: string, key: keyof Student, type = 'text') => (
    <Field label={label}>
      <EditableText type={type} value={String(s[key] ?? '')} onCommit={(v) => set({ [key]: v } as Partial<Student>)} />
    </Field>
  );

  return (
    <Page
      back={cls ? { to: `/students/class/${cls.id}`, label: cls.name } : { to: '/students', label: 'Students' }}
      title={fullName(s)}
      subtitle={`${s.regNo || 'No registration number'} · ${cls?.name ?? 'No class'} · ${s.status}`}
      actions={
        <>
          <Button icon={<GraduationCap className="h-4 w-4" />} busy={busy === 'transcript'} onClick={() => void transcript()}>
            Transcript (PDF)
          </Button>
          <Button
            variant="danger"
            aria-label="Delete student"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              if (!(await confirm(`Delete ${fullName(s)}?`, { danger: true, ok: 'Delete', detail: 'Their biodata and all their marks are deleted.' }))) return;
              update((w) => ({ ...w, students: w.students.filter((x) => x.id !== s.id), marks: w.marks.filter((m) => m.studentId !== s.id) }));
              navigate(cls ? `/students/class/${cls.id}` : '/students');
            }}
          />
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Biodata">
          <div className="grid gap-3 sm:grid-cols-2">
            {field('Registration number', 'regNo')}
            <Field label="Class">
              <Select value={s.classId} onChange={(e) => set({ classId: e.target.value })}>
                <option value="">No class</option>
                {[...ws.classes]
                  .sort((a, b) => a.year - b.year)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            {field('First name', 'firstName')}
            {field('Last name / surname', 'lastName')}
            {field('Other names', 'otherNames')}
            <Field label="Gender">
              <Select value={s.gender} onChange={(e) => set({ gender: e.target.value as Student['gender'] })}>
                <option value="">—</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </Select>
            </Field>
            {field('Date of birth', 'dateOfBirth', 'date')}
            {field('National ID number', 'nationalId')}
            {field('Nationality', 'nationality')}
            {field('Phone', 'phone', 'tel')}
            {field('Email', 'email', 'email')}
            {field('Home address / district', 'address')}
            {field('Parent / guardian / next of kin', 'guardianName')}
            {field('Guardian phone', 'guardianPhone', 'tel')}
            {field('Relationship', 'guardianRelation')}
            {field('Admission date', 'admissionDate', 'date')}
            {field('Sponsorship', 'sponsorship')}
            <Field label="Status">
              <Select value={s.status} onChange={(e) => set({ status: e.target.value as StudentStatus })}>
                {STATUSES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea defaultValue={s.notes} onBlur={(e) => e.target.value !== s.notes && set({ notes: e.target.value })} />
            </Field>
          </div>
        </Card>
        <div className="space-y-5">
          <Card title={`Academic record — cumulative GPA ${overall ?? '—'}`}>
            {byYear.length === 0 ? (
              <p className="text-sm text-muted">No course units for this student’s year yet.</p>
            ) : (
              byYear.map((y) => (
                <div key={y.year} className="mb-4">
                  <div className="mb-1 flex justify-between text-sm font-semibold">
                    <span>Year {y.year}</span>
                    <span className="text-muted">GPA {y.gpa ?? '—'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left text-muted">
                        <tr>
                          <th className="p-1">Unit</th>
                          {components.map((c) => (
                            <th key={c.id} className="p-1">
                              {c.name}
                            </th>
                          ))}
                          <th className="p-1">Final</th>
                          <th className="p-1">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {y.results.map(({ unit, result }) => (
                          <tr key={unit.id} className="border-t border-line">
                            <td className="p-1">
                              {cls ? (
                                <A to={`/students/class/${cls.id}/marks`} query={{ unit: unit.id }}>
                                  {unit.code || unit.title}
                                </A>
                              ) : (
                                unit.code || unit.title
                              )}
                            </td>
                            {components.map((c) => (
                              <td key={c.id} className="p-1">
                                {result.scores[c.id] ?? '—'}
                              </td>
                            ))}
                            <td className={cx('p-1 font-semibold', result.passed === false && 'text-bad')}>{result.weighted ?? '—'}</td>
                            <td className="p-1">{result.grade || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
