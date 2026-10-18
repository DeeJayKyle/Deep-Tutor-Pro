import { expect, it } from 'vitest';
import { updateScore, calculateGrade, csvCell } from '../src/services/gradebook';
import { INITIAL_STUDENT_MARKS } from '../src/services/storage';
it.each([[80,'A',5],[79,'B+',4.5],[75,'B+',4.5],[74,'B',4],[65,'C+',3.5],[60,'C',3],[50,'D',2],[49,'F',0]])('grades %s consistently', (total, grade, gp) => expect(calculateGrade(Number(total))).toEqual({grade,gp}));
it.each([-20,100,NaN,Infinity])('bounds CAT scores: %s', input => {
 const mark = updateScore(INITIAL_STUDENT_MARKS[0], 'cat1Score', input);
 expect(mark.cat1Score).toBeGreaterThanOrEqual(0); expect(mark.cat1Score).toBeLessThanOrEqual(15);
 expect(mark.totalPercentage).toBe(mark.cat1Score+mark.cat2Score+mark.assignmentScore+mark.practicalScore+mark.finalExamScore);
});
it('escapes quotes, commas, newlines and formula cells', () => {
 expect(csvCell('A,"B"\nC')).toBe('"A,""B""\nC"');
 expect(csvCell('=SUM(1,2)')).toBe('"\'=SUM(1,2)"');
 expect(csvCell(' +cmd')).toBe('"\' +cmd"');
});
