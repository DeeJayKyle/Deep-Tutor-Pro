import { describe, expect, it } from 'vitest';
import { gpa, gradeFor, parseScore, rank, scoresFor, stats, unitResult, weightedTotal } from '../src/lib/grading';
import { DEFAULT_BANDS, DEFAULT_COMPONENTS } from '../src/lib/workspace';
import type { GradeComponent, MarkEntry, Unit } from '../src/lib/model';
import type { UnitResult } from '../src/lib/grading';

const comp = (id: string, weight: number, maxScore = 100): GradeComponent => ({ id, name: id, kind: 'coursework', weight, maxScore });
const mark = (studentId: string, unitId: string, componentId: string, score: number | null): MarkEntry => ({
  id: `${studentId}-${unitId}-${componentId}`,
  studentId,
  unitId,
  componentId,
  score,
  remark: '',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('weightedTotal', () => {
  it('computes the default 15/15/10/60 scheme', () => {
    const r = weightedTotal(DEFAULT_COMPONENTS, { cat1: 80, cat2: 60, assign: 90, exam: 70 });
    // 12 + 9 + 9 + 42 = 72
    expect(r).toEqual({ total: 72, complete: true });
  });

  it('scales weights that do not sum to 100 into a percentage', () => {
    const comps = [comp('a', 30), comp('b', 30)];
    expect(weightedTotal(comps, { a: 50, b: 100 })).toEqual({ total: 75, complete: true });
    // weights 1 + 3: (1*1 + 0*3) / 4 = 25%
    expect(weightedTotal([comp('x', 1), comp('y', 3)], { x: 100, y: 0 }).total).toBe(25);
  });

  it('converts scores entered out of a component maximum', () => {
    const comps = [comp('cat', 40, 15), comp('exam', 60, 50)];
    // 12/15 = 0.8 * 40 = 32; 25/50 = .5*60 = 30
    expect(weightedTotal(comps, { cat: 12, exam: 25 }).total).toBe(62);
  });

  it('caps scores above the maximum and floors negatives at zero', () => {
    const comps = [comp('a', 50), comp('b', 50)];
    expect(weightedTotal(comps, { a: 150, b: -20 }).total).toBe(50);
  });

  it('marks results incomplete when a component is missing, null or NaN', () => {
    const comps = [comp('a', 50), comp('b', 50)];
    expect(weightedTotal(comps, { a: 80 })).toEqual({ total: 40, complete: false });
    expect(weightedTotal(comps, { a: 80, b: null }).complete).toBe(false);
    expect(weightedTotal(comps, { a: 80, b: Number.NaN }).complete).toBe(false);
  });

  it('returns null when nothing is entered and never divides by zero', () => {
    expect(weightedTotal([comp('a', 50)], {})).toEqual({ total: null, complete: false });
    expect(weightedTotal([], { a: 10 })).toEqual({ total: null, complete: false });
    const zero = weightedTotal([comp('a', 0), comp('b', 0)], { a: 50, b: 50 });
    expect(Number.isFinite(zero.total ?? 0)).toBe(true);
  });
});

describe('gradeFor', () => {
  it('picks the band whose minimum the percentage reaches', () => {
    expect(gradeFor(80, DEFAULT_BANDS)?.grade).toBe('A');
    expect(gradeFor(79.9, DEFAULT_BANDS)?.grade).toBe('B+');
    expect(gradeFor(50, DEFAULT_BANDS)?.grade).toBe('C');
    expect(gradeFor(0, DEFAULT_BANDS)?.grade).toBe('F');
  });
  it('works with unsorted bands and below-range values', () => {
    const shuffled = [...DEFAULT_BANDS].reverse();
    expect(gradeFor(72, shuffled)?.grade).toBe('B+');
    expect(gradeFor(-5, DEFAULT_BANDS)?.grade).toBe('F');
    expect(gradeFor(null, DEFAULT_BANDS)).toBeNull();
    expect(gradeFor(50, [])).toBeNull();
  });
});

describe('unitResult', () => {
  const marks = [
    mark('s1', 'u1', 'cat1', 100),
    mark('s1', 'u1', 'cat2', 100),
    mark('s1', 'u1', 'assign', 100),
    mark('s1', 'u1', 'exam', 30),
    mark('s1', 'u2', 'exam', 90), // other unit — ignored
    mark('s2', 'u1', 'exam', 10), // other student — ignored
  ];
  it('combines the student marks for one unit', () => {
    const r = unitResult(marks, 's1', 'u1', DEFAULT_COMPONENTS, DEFAULT_BANDS, 50);
    expect(r.weighted).toBe(58);
    expect(r.complete).toBe(true);
    expect(r.grade).toBe('C+');
    expect(r.points).toBe(3.5);
    expect(r.passed).toBe(true);
    expect(r.scores).toEqual({ cat1: 100, cat2: 100, assign: 100, exam: 30 });
  });
  it('reports failure and no result correctly', () => {
    const fail = unitResult(marks, 's2', 'u1', DEFAULT_COMPONENTS, DEFAULT_BANDS, 50);
    expect(fail.complete).toBe(false);
    expect(fail.passed).toBe(false);
    const none = unitResult(marks, 's3', 'u1', DEFAULT_COMPONENTS, DEFAULT_BANDS, 50);
    expect(none).toMatchObject({ weighted: null, passed: null, grade: '', points: 0 });
  });
  it('scoresFor keeps null scores (entered as blank)', () => {
    expect(scoresFor([mark('a', 'u', 'c', null)], 'a', 'u')).toEqual({ c: null });
  });
});

describe('rank (competition ranking)', () => {
  it('gives ties the same position and skips the next', () => {
    expect(rank([
      { id: 'a', value: 90 },
      { id: 'b', value: 90 },
      { id: 'c', value: 80 },
    ])).toEqual({ a: 1, b: 1, c: 3 });
  });
  it('handles unsorted input, multiple ties and nulls', () => {
    expect(rank([
      { id: 'a', value: 50 },
      { id: 'b', value: null },
      { id: 'c', value: 70 },
      { id: 'd', value: 70 },
      { id: 'e', value: 70 },
      { id: 'f', value: 50 },
      { id: 'g', value: 10 },
    ])).toEqual({ c: 1, d: 1, e: 1, a: 4, f: 4, g: 6, b: null });
  });
  it('returns an empty map for no students', () => {
    expect(rank([])).toEqual({});
  });
});

describe('stats', () => {
  it('computes mean, median, sd and pass rate ignoring nulls/NaN', () => {
    const s = stats([40, 60, null, 80, Number.NaN, 20], 50);
    expect(s).toEqual({ count: 4, mean: 50, median: 50, min: 20, max: 80, sd: 22.4, passRate: 50 });
  });
  it('odd count median and empty input', () => {
    expect(stats([3, 1, 2]).median).toBe(2);
    expect(stats([null])).toEqual({ count: 0, mean: null, median: null, min: null, max: null, sd: null, passRate: null });
  });
});

describe('gpa', () => {
  const unit = (creditUnits: number) => ({ creditUnits }) as Unit;
  const res = (points: number, weighted: number | null) => ({ points, weighted }) as UnitResult;
  it('weights grade points by credit units', () => {
    // (5*4 + 2*2) / 6 = 4
    expect(gpa([{ unit: unit(4), result: res(5, 85) }, { unit: unit(2), result: res(2, 42) }])).toBe(4);
  });
  it('counts zero-credit units as one credit and skips units without results', () => {
    expect(gpa([{ unit: unit(0), result: res(5, 90) }, { unit: unit(1), result: res(3, 50) }, { unit: unit(10), result: res(0, null) }])).toBe(4);
  });
  it('rounds to two decimals and returns null with no results', () => {
    expect(gpa([{ unit: unit(3), result: res(5, 90) }, { unit: unit(3), result: res(4.5, 75) }, { unit: unit(3), result: res(4, 65) }, { unit: unit(1), result: res(0, 10) }])).toBe(4.05);
    expect(gpa([])).toBeNull();
  });
});

describe('parseScore', () => {
  it('accepts blanks, numbers and decimal commas', () => {
    expect(parseScore('', 100)).toEqual({ ok: true, value: null });
    expect(parseScore('  ', 100)).toEqual({ ok: true, value: null });
    expect(parseScore('42', 100)).toEqual({ ok: true, value: 42 });
    expect(parseScore('12,5', 15)).toEqual({ ok: true, value: 12.5 });
    expect(parseScore('7.456', 10)).toEqual({ ok: true, value: 7.46 });
    expect(parseScore('100', 100)).toEqual({ ok: true, value: 100 });
  });
  it('rejects text, negatives and scores above the maximum', () => {
    expect(parseScore('abc', 100)).toEqual({ ok: false, error: 'Enter a number' });
    expect(parseScore('Infinity', 100)).toEqual({ ok: false, error: 'Enter a number' });
    expect(parseScore('-1', 100)).toEqual({ ok: false, error: 'Marks cannot be negative' });
    expect(parseScore('16', 15)).toEqual({ ok: false, error: 'Maximum is 15' });
  });
});
