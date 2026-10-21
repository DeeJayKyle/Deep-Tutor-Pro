import type { GradeBand, GradeComponent, MarkEntry, Unit } from './model';

export interface UnitResult {
  scores: Record<string, number | null>; // componentId → raw score
  weighted: number | null; // final percentage, null when nothing entered
  complete: boolean; // every component has a score
  grade: string;
  points: number;
  remark: string;
  passed: boolean | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Final percentage from component scores, each entered out of its maxScore. */
export function weightedTotal(components: GradeComponent[], scores: Record<string, number | null | undefined>): { total: number | null; complete: boolean } {
  let total = 0;
  let any = false;
  let complete = components.length > 0;
  const weightSum = components.reduce((s, c) => s + c.weight, 0) || 100;
  for (const c of components) {
    const v = scores[c.id];
    if (v === null || v === undefined || !Number.isFinite(v)) {
      complete = false;
      continue;
    }
    any = true;
    const fraction = Math.min(Math.max(v, 0), c.maxScore) / (c.maxScore || 100);
    total += fraction * c.weight;
  }
  if (!any) return { total: null, complete: false };
  // Weights that do not add to 100 are scaled so the result is a percentage.
  return { total: round1((total / weightSum) * 100), complete };
}

export function gradeFor(percent: number | null, bands: GradeBand[]): GradeBand | null {
  if (percent === null) return null;
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => percent >= b.min) ?? sorted[sorted.length - 1] ?? null;
}

export function scoresFor(marks: MarkEntry[], studentId: string, unitId: string): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const m of marks) if (m.studentId === studentId && m.unitId === unitId) out[m.componentId] = m.score;
  return out;
}

export function unitResult(
  marks: MarkEntry[],
  studentId: string,
  unitId: string,
  components: GradeComponent[],
  bands: GradeBand[],
  passMark: number,
): UnitResult {
  const scores = scoresFor(marks, studentId, unitId);
  const { total, complete } = weightedTotal(components, scores);
  const band = gradeFor(total, bands);
  return {
    scores,
    weighted: total,
    complete,
    grade: band?.grade ?? '',
    points: band?.points ?? 0,
    remark: band?.remark ?? '',
    passed: total === null ? null : total >= passMark,
  };
}

/** Competition ranking ("1, 2, 2, 4"): equal scores share a position. */
export function rank(values: { id: string; value: number | null }[]): Record<string, number | null> {
  const scored = values.filter((v) => v.value !== null) as { id: string; value: number }[];
  scored.sort((a, b) => b.value - a.value);
  const out: Record<string, number | null> = {};
  scored.forEach((v, i) => {
    out[v.id] = i > 0 && scored[i - 1].value === v.value ? out[scored[i - 1].id] : i + 1;
  });
  for (const v of values) if (v.value === null) out[v.id] = null;
  return out;
}

export interface Stats {
  count: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  sd: number | null;
  passRate: number | null;
}

export function stats(values: (number | null)[], passMark = 50): Stats {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { count: 0, mean: null, median: null, min: null, max: null, sd: null, passRate: null };
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
  return {
    count: v.length,
    mean: round1(mean),
    median: round1(median),
    min: v[0],
    max: v[v.length - 1],
    sd: round1(sd),
    passRate: round1((v.filter((x) => x >= passMark).length / v.length) * 100),
  };
}

/** Credit-weighted grade point average across units (units without credits count as 1). */
export function gpa(results: { unit: Unit; result: UnitResult }[]): number | null {
  let pts = 0;
  let credits = 0;
  for (const { unit, result } of results) {
    if (result.weighted === null) continue;
    const c = unit.creditUnits || 1;
    pts += result.points * c;
    credits += c;
  }
  return credits ? Math.round((pts / credits) * 100) / 100 : null;
}

/** Validate a typed score against a component's maximum. */
export function parseScore(input: string, max: number): { ok: true; value: number | null } | { ok: false; error: string } {
  const text = input.trim();
  if (text === '') return { ok: true, value: null };
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value)) return { ok: false, error: 'Enter a number' };
  if (value < 0) return { ok: false, error: 'Marks cannot be negative' };
  if (value > max) return { ok: false, error: `Maximum is ${max}` };
  return { ok: true, value: Math.round(value * 100) / 100 };
}
