import type { StudentMarkRecord } from '../types';
export const SCORE_LIMITS = { cat1Score: 15, cat2Score: 15, assignmentScore: 10, practicalScore: 20, finalExamScore: 40 } as const;
export function calculateGrade(total: number): { grade: StudentMarkRecord['letterGrade']; gp: number } {
  if (total >= 80) return { grade: 'A', gp: 5 };
  if (total >= 75) return { grade: 'B+', gp: 4.5 };
  if (total >= 70) return { grade: 'B', gp: 4 };
  if (total >= 65) return { grade: 'C+', gp: 3.5 };
  if (total >= 60) return { grade: 'C', gp: 3 };
  if (total >= 50) return { grade: 'D', gp: 2 };
  return { grade: 'F', gp: 0 };
}
export function updateScore(mark: StudentMarkRecord, field: keyof typeof SCORE_LIMITS, value: number): StudentMarkRecord {
  const next = { ...mark, [field]: Math.max(0, Math.min(SCORE_LIMITS[field], Number.isFinite(value) ? value : 0)) };
  const total = Math.round(Object.keys(SCORE_LIMITS).reduce((sum, key) => sum + next[key as keyof typeof SCORE_LIMITS], 0) * 100) / 100;
  const { grade, gp } = calculateGrade(total);
  return { ...next, totalPercentage: total, letterGrade: grade, gradePoint: gp };
}
/** Quote CSV fields and neutralize spreadsheet formula execution in user input. */
export function csvCell(value: string | number): string {
  const text = String(value);
  return '"' + (/^[\s]*[=+\-@]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
}
