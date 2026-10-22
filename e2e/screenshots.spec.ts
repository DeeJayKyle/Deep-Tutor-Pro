// Design-review screenshots (run with SHOTS=<dir>); skipped in normal test runs.
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';

const OUT = process.env.SHOTS;
test.skip(!OUT, 'Set SHOTS=<dir> to capture design-review screenshots');

const T = '2026-10-01T09:00:00.000Z';
const topics = (pairs: [string, number][]) => pairs.map(([title, hours], i) => ({ id: `t${title.length}${i}`, title, hours, objectives: [`Explain ${title.toLowerCase()}`, `Apply ${title.toLowerCase()} in practice`], subtopics: ['Definitions', 'Mechanisms', 'Clinical relevance'], practicals: i % 2 ? 'Laboratory demonstration' : '' }));
const units = [
  ['PHA 111', 'Pharmaceutics I', 1, 1, 45, [['Introduction to pharmaceutics', 6], ['Solutions and suspensions', 15], ['Tablets and capsules', 24]]],
  ['PHA 112', 'Pharmacology I', 1, 1, 60, [['Principles of pharmacology', 10], ['Pharmacokinetics', 25], ['Pharmacodynamics', 25]]],
  ['PHA 113', 'Pharmaceutical Chemistry I', 1, 2, 45, [['Organic functional groups', 15], ['Drug stability', 15], ['Analytical techniques', 15]]],
  ['PHA 121', 'Human Anatomy & Physiology', 1, 2, 60, [['Cells and tissues', 20], ['Cardiovascular system', 20], ['Renal system', 20]]],
  ['PHA 211', 'Dispensing Practice', 2, 1, 40, [['The prescription', 10], ['Labelling and counselling', 30]]],
  ['PHA 212', 'Clinical Pharmacy', 2, 2, 50, [['Medication review', 25], ['Adverse drug reactions', 25]]],
] as const;
const unitObjs = units.map(([code, title, year, semester, total, t], i) => ({ id: `u${i}`, programmeId: 'p1', code, title, year, semester, creditUnits: 3, hours: { lecture: total - 10, tutorial: 5, practical: 5, clinical: 0, total }, overview: `This unit introduces learners to ${title.toLowerCase()} for safe pharmacy practice.`, aims: ['Build foundational knowledge'], outcomes: ['Apply concepts in practice'], topics: topics(t as unknown as [string, number][]), teachingMethods: ['Lecture', 'Practical'], assessment: 'CAT 30%, exam 70%', references: ['Aulton’s Pharmaceutics'], hoursEstimated: false, referenceIds: ['r1'], analysed: true, createdAt: T, updatedAt: T }));
const pk = unitObjs[1].topics[1];
const md = `# Pharmacokinetics\n\n## Learning objectives\n- Explain absorption, distribution, metabolism and excretion\n- Calculate half-life and clearance\n\n## Introduction\nPharmacokinetics describes what the body does to a drug over time. [Source: S1]\n\n## Contact hours 11–12: Absorption\nAbsorption is the movement of a drug from its site of administration into the blood. **Bioavailability** is reduced by *first-pass metabolism*. [Source: S1]\n\n| Route | Bioavailability | Onset |\n|---|---|---|\n| Intravenous | 100% | Immediate |\n| Oral | 5–100% | 30–90 min |\n| Sublingual | High | Minutes |\n\n> Clinical pearl: always counsel patients to take doxycycline with a full glass of water.\n\n## Summary of key points\n1. ADME determines dosing\n2. Half-life sets the dosing interval\n`;
const q = (i: number, type: string, marks: number) => ({ id: `q${i}`, type, prompt: type === 'mcq' ? `Which statement best describes bioavailability? (${i})` : `Explain first-pass metabolism and its clinical importance. (${i})`, options: type === 'mcq' ? ['Rate of excretion', 'Fraction reaching systemic circulation', 'Plasma half-life', 'Potency'] : [], answerIndex: type === 'mcq' ? 1 : null, answer: 'Fraction reaching systemic circulation', solution: 'Bioavailability is the fraction of an administered dose that reaches the systemic circulation unchanged.', markingPoints: [{ point: 'Correct definition', marks: Math.max(1, marks - 1) }, { point: 'Example', marks: 1 }], marks, topic: 'Pharmacokinetics', difficulty: 'moderate', outcome: '' });
const names = ['Amina Nakato', 'Brian Okello', 'Grace Achieng', 'David Mugisha', 'Esther Namuli', 'Felix Ouma', 'Hope Atim', 'Isaac Kato', 'Joan Akello', 'Kevin Ssali', 'Lydia Nansubuga', 'Moses Opio'];
const students = names.map((n, i) => { const [firstName, lastName] = n.split(' '); return { id: `s${i}`, regNo: `DIP/PHA/2026/${String(i + 1).padStart(3, '0')}`, firstName, lastName, otherNames: '', gender: i % 2 ? 'Male' : 'Female', dateOfBirth: '2004-05-12', nationalId: '', phone: `0772 ${100000 + i * 7}`, email: `${firstName.toLowerCase()}@students.example`, address: 'Kampala', nationality: 'Ugandan', guardianName: 'Parent', guardianPhone: '0700 000000', guardianRelation: 'Mother', classId: 'c1', admissionDate: '2026-08-15', sponsorship: 'Private', status: i === 7 ? 'Deferred' : 'Active', notes: '', createdAt: T, updatedAt: T }; });
const marks = students.flatMap((s, i) => ['cat1', 'cat2', 'assign', 'exam'].map((c, j) => ({ id: `m${i}${j}`, studentId: s.id, unitId: 'u1', componentId: c, score: Math.max(25, Math.min(97, 48 + ((i * 17 + j * 11) % 47))), remark: '', updatedAt: T })));
const workspace = {
  schema: 3,
  programmes: [{ id: 'p1', title: 'Diploma in Pharmacy', institution: 'Allied Health Examinations Board', awardLevel: 'Diploma', durationYears: 3, totalHours: 300, overview: 'A three-year programme preparing competent pharmacy technicians for community and hospital practice.', entryRequirements: 'UCE with credits in sciences', assessmentPolicy: 'Coursework 40%, exam 60%', sourceReferenceId: 'r1', createdAt: T, updatedAt: T }],
  classes: [1, 2, 3].map((y) => ({ id: `c${y}`, programmeId: 'p1', name: `Diploma in Pharmacy — Year ${y}`, year: y, intake: String(2027 - y), academicYear: '2026/2027', notes: '', createdAt: T })),
  units: unitObjs,
  notes: unitObjs[1].topics.map((t, i) => ({ id: `n${i}`, unitId: 'u1', topicId: t.id, title: t.title, markdown: i === 1 ? md : `# ${t.title}\n\nNotes for ${t.title}.`, hourStart: [1, 11, 36][i], hourEnd: [10, 35, 60][i], status: i === 0 ? 'final' : 'draft', sourceIds: ['r1'], model: 'Google Gemini · gemini-flash-latest', createdAt: T, updatedAt: T })),
  references: [{ id: 'r1', name: 'Diploma-in-Pharmacy-Curriculum.pdf', category: 'curriculum', mime: 'application/pdf', size: 2400000, text: 'Diploma in Pharmacy curriculum…', pages: 86, ocrPages: 12, unitIds: ['u1'], addedAt: T }, { id: 'r2', name: 'Rang-and-Dale-Pharmacology.pdf', category: 'textbook', mime: 'application/pdf', size: 18000000, text: 'Pharmacokinetics…', pages: 790, ocrPages: 0, unitIds: ['u1'], addedAt: T }, { id: 'r3', name: 'Uganda-Clinical-Guidelines-2023.pdf', category: 'guideline', mime: 'application/pdf', size: 9000000, text: 'Guidelines…', pages: 1100, ocrPages: 0, unitIds: [], addedAt: T }],
  papers: [{ id: 'pp1', unitId: 'u1', kind: 'exam', title: 'PHA 112 Pharmacology I — End of semester examination', instructions: 'Answer ALL questions in Sections A and B and any TWO in Section C.', duration: '3 hours', academicYear: '2026/2027', sections: [{ id: 's1', title: 'Section A: Multiple choice', type: 'mcq', instructions: 'Choose the best answer.', choose: 0, questions: [q(1, 'mcq', 1), q(2, 'mcq', 1)] }, { id: 's2', title: 'Section C: Long essays', type: 'essay', instructions: 'Answer any two.', choose: 2, questions: [q(3, 'essay', 20), q(4, 'essay', 20), q(5, 'essay', 20)] }], topicIds: [pk.id], status: 'draft', model: 'Google Gemini', createdAt: T, updatedAt: T }],
  bank: [1, 2, 3, 4].map((i) => ({ ...q(10 + i, i % 2 ? 'mcq' : 'short', i % 2 ? 1 : 5), id: `b${i}`, unitId: 'u1', topicId: pk.id, source: 'ai', createdAt: T })),
  students,
  marks,
  chats: [{ id: 'ch1', kind: 'solve', title: 'Paediatric amoxicillin dose', unitId: 'u1', createdAt: T, updatedAt: T, messages: [{ id: 'm1', role: 'user', content: 'Calculate the dose of amoxicillin suspension (125 mg/5 mL) for a 14 kg child at 25 mg/kg/day in 3 divided doses.', attachments: [], createdAt: T }, { id: 'm2', role: 'assistant', content: '**Step 1 — daily dose:** 25 mg/kg/day × 14 kg = 350 mg/day\n\n**Step 2 — per dose:** 350 mg ÷ 3 = 116.7 mg\n\n**Step 3 — volume:** 116.7 mg × 5 mL / 125 mg = 4.7 mL\n\n**Final answer:** give **4.7 mL three times a day**.', attachments: [], model: 'Google Gemini · gemini-flash-latest', createdAt: T }] }],
  settings: { institution: 'Kampala School of Pharmacy', tutorName: 'Mr. Kyle', department: 'Pharmacy', academicYear: '2026/2027', provider: 'auto', noteDetail: 'standard', passMark: 50, autoSync: true, theme: 'dark' },
  deleted: {},
  updatedAt: T,
};

const SCREENS: [string, string][] = [
  ['home', '/'],
  ['curriculum', '/curriculum'],
  ['programme', '/programmes/p1'],
  ['units', '/units'],
  ['unit-outline', '/units/u1'],
  ['unit-notes', '/units/u1?tab=notes'],
  ['library', '/library'],
  ['notes', '/notes'],
  ['note-editor', '/notes/n1'],
  ['assessments', '/assessments'],
  ['assessment-new', '/assessments/new?unit=u1'],
  ['paper', '/assessments/pp1'],
  ['bank', '/bank?unit=u1'],
  ['students', '/students'],
  ['class', '/students/class/c1'],
  ['marks', '/students/class/c1/marks?unit=u1'],
  ['student', '/students/s0'],
  ['solve', '/solve/ch1'],
  ['research', '/research'],
  ['settings', '/settings?tab=grading'],
];

for (const theme of ['dark', 'light'] as const) {
  test(`screens ${theme}`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await page.evaluate(
      async ({ ws, theme }) => {
        const db: IDBDatabase = await new Promise((res, rej) => {
          const r = indexedDB.open('deep-tutor-pro', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('kv');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res) => {
          const tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put({ ...ws, settings: { ...ws.settings, theme } }, 'workspace');
          tx.oncomplete = () => res();
        });
      },
      { ws: workspace, theme },
    );
    const report: Record<string, unknown> = {};
    for (const [name, path] of SCREENS) {
      await page.goto(`/#${path}`);
      await page.reload();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/${info.project.name}-${theme}-${name}.png`, fullPage: info.project.name === 'desktop' });
      const overflow = await page.evaluate(() => {
        const w = document.documentElement.clientWidth;
        return [...document.querySelectorAll('body *')]
          .filter((el) => { const r = el.getBoundingClientRect(); return r.right > w + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed'; })
          .filter((el) => !el.closest('.overflow-x-auto, .overflow-auto'))
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      });
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      report[name] = { overflow, violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, sample: v.nodes.slice(0, 2).map((n) => n.target.join(' ') + ' :: ' + n.failureSummary?.split('\n')[1]) })) };
    }
    writeFileSync(`${OUT}/audit-${info.project.name}-${theme}.json`, JSON.stringify(report, null, 1));
  });
}
