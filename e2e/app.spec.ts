import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { installFakeServer, signIn } from './fake-server';

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url).pathname;

const SCREENS: [string, RegExp][] = [
  ['/', /Welcome/],
  ['/curriculum', /Curriculum/],
  ['/units', /Classes & course units/],
  ['/library', /Reference library/],
  ['/notes', /Lecture notes/],
  ['/assessments', /Exams, coursework & assignments/],
  ['/bank', /Question bank/],
  ['/students', /Students & marks/],
  ['/solve', /Deep Solve/],
  ['/research', /Tutor chat & research/],
  ['/knowledge', /Knowledge bases/],
  ['/settings', /Settings/],
];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function importCurriculum(page: Page) {
  page.on('console', (m) => process.env.DEBUG_E2E && console.log('console:', m.text()));
  await page.goto('/#/curriculum?import=1');
  await page.locator('input[type=file]').first().setInputFiles(fixture('curriculum.pdf'));
  await expect(page.getByText(/curriculum\.pdf — [\d,]+ characters/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Analyse with AI' }).click();
  await expect(page.getByText('Review the analysis')).toBeVisible();
  await page.getByRole('button', { name: /Create programme, classes & units/ }).click();
  await expect(page.getByRole('heading', { name: 'Year 1', exact: true })).toBeVisible();
}

test('every screen opens without errors on a fresh install (signed out, offline-capable)', async ({ page }) => {
  const errors = collectErrors(page);
  for (const [path, heading] of SCREENS) {
    await page.goto(`/#${path}`);
    await expect(page.locator('main h1').first()).toHaveText(heading);
  }
  expect(errors).toEqual([]);
});

test('curriculum import reads the PDF on the device and builds classes, units and contact-hour outlines', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Covered on desktop');
  const server = await installFakeServer(page);
  const errors = collectErrors(page);
  await signIn(page);
  await importCurriculum(page);

  // The analysed text sent to the AI came from the real PDF text layer.
  const outline = server.calls.find((c) => c.path === '/tutorpro/curriculum/outline');
  expect(String((outline?.body as { text: string }).text)).toContain('CP 112 Pharmacology I');

  // Per-unit details run in the background, with each unit's own section of the document.
  await expect(page.getByText('3 topics').first()).toBeVisible({ timeout: 30_000 });
  const unitCall = server.calls.find((c) => c.path === '/tutorpro/curriculum/unit' && (c.body as { unit: { title: string } }).unit.title === 'Dispensing Practice');
  expect(String((unitCall?.body as { text: string }).text)).toContain('Labelling and counselling');

  // Classes per year are created and linked.
  await page.goto('/#/students');
  await expect(page.getByRole('heading', { name: 'Year 2', exact: true })).toBeVisible();

  // Outline: topics are numbered by contact hours.
  await page.goto('/#/units');
  await page.getByText('Pharmacology I', { exact: true }).click();
  await expect(page.getByText('Hours 11–35')).toBeVisible();
  expect(errors).toEqual([]);
});

test('library reads Word documents and scanned pages (OCR) offline', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Covered on desktop');
  test.setTimeout(120_000);
  await page.goto('/#/library');
  await page.locator('input[type=file]').first().setInputFiles([fixture('pharmacokinetics-chapter.docx'), fixture('scanned-page.pdf')]);
  await expect(page.getByText('2 documents added to the library')).toBeVisible({ timeout: 100_000 });
  await page.getByRole('link', { name: 'pharmacokinetics-chapter.docx' }).click();
  await expect(page.getByLabel(/Extracted text/)).toHaveValue(/first-pass metabolism/);
  await expect(page.getByLabel(/Extracted text/)).toHaveValue(/Half-life \| Time for plasma/);
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();
  await page.getByRole('link', { name: 'scanned-page.pdf' }).click();
  await expect(page.getByLabel(/Extracted text/)).toHaveValue(/vaccines/i);
});

test('lecture notes are generated per topic, edited, and exported to Word, PDF and PowerPoint', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Covered on desktop');
  await installFakeServer(page);
  await signIn(page);
  await importCurriculum(page);
  await expect(page.getByText('3 topics').first()).toBeVisible({ timeout: 30_000 });
  await page.goto('/#/units');
  await page.getByText('Pharmacology I', { exact: true }).click();
  await page.getByRole('tab', { name: /Lecture notes/ }).click();
  await page.getByRole('button', { name: /Generate missing \(3\)/ }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open' })).toHaveCount(3, { timeout: 30_000 });
  await page.getByRole('link', { name: 'Open' }).nth(1).click();
  await expect(page.locator('#sec-pharmacokinetics')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contact hour 11: Introduction' })).toBeVisible();

  for (const [button, ext, magic] of [
    ['Word', 'docx', 'PK'],
    ['PDF', 'pdf', '%PDF'],
    ['PowerPoint', 'pptx', 'PK'],
  ] as const) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: button, exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`));
    const bytes = readFileSync((await file.path())!);
    expect(bytes.subarray(0, magic.length).toString('latin1')).toBe(magic);
  }

  // AI edit with undo.
  await page.getByLabel('AI instruction').fill('Add an example');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('heading', { name: 'Added by AI' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo AI edit' }).click();
  await expect(page.getByRole('heading', { name: 'Added by AI' })).toHaveCount(0);
});

test('exams follow a reference paper format and export with a marking scheme', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Covered on desktop');
  const server = await installFakeServer(page);
  await signIn(page);
  await importCurriculum(page);
  await expect(page.getByText('3 topics').first()).toBeVisible({ timeout: 30_000 });
  await page.goto('/#/assessments/new');
  await page.getByLabel('Course unit').selectOption({ label: 'CP 112 · Pharmacology I' });
  await page.locator('input[type=file]').first().setInputFiles(fixture('past-paper.pdf'));
  await expect(page.getByText(/Format saved: 2 sections, 42 marks/)).toBeVisible({ timeout: 30_000 });
  // Untick one topic: only the chosen topics are sent.
  await page.getByLabel('Principles of pharmacology (10 h, hours 1–10)').uncheck();
  await page.getByRole('button', { name: 'Write the paper' }).click();
  await expect(page.getByText('42 marks', { exact: true })).toBeVisible({ timeout: 30_000 });
  const call = server.calls.find((c) => c.path === '/tutorpro/assessment')!.body as { topics: { title: string }[]; style_notes: string };
  expect(call.topics.map((t) => t.title)).toEqual(['Pharmacokinetics', 'Pharmacodynamics']);
  expect(call.style_notes).toBe('Formal wording');

  const download = page.waitForEvent('download');
  await page.locator('aside').getByRole('button', { name: 'Word' }).nth(1).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/marking-scheme\.docx$/);

  // Questions went to the bank too.
  await page.goto('/#/bank');
  await expect(page.getByText('5 questions', { exact: true })).toBeVisible();
});

test('students: biodata, marks with weighted grades, persistence after reload', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#/students');
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByRole('button', { name: 'Add student' }).first().click();
  await page.getByLabel('Registration number').fill('CP/2026/001');
  await page.getByLabel('First name').fill('Amina');
  await page.getByLabel('Last name / surname').fill('Nakato');
  await page.getByLabel('Last name / surname').press('Tab');
  await page.getByLabel('Gender').selectOption('Female');
  await expect(page.locator('main h1')).toHaveText('Amina Nakato');

  // A course unit for Year 1 so marks can be entered.
  await page.goto('/#/units?add=1');
  await expect(page.locator('main h1')).toHaveText('New course unit');
  await page.goto('/#/students');
  await page.getByRole('link', { name: 'Marks', exact: true }).first().click();
  await page.getByLabel('CAT 1 for Amina Nakato').fill('80');
  await page.getByLabel('CAT 2 for Amina Nakato').fill('70');
  await page.getByLabel('Assignment for Amina Nakato').fill('90');
  await page.getByLabel('End of semester exam for Amina Nakato').fill('60');
  await page.getByLabel('End of semester exam for Amina Nakato').press('Tab');
  // 80*.15 + 70*.15 + 90*.10 + 60*.60 = 67.5 → B
  await expect(page.getByRole('cell', { name: '67.5' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'B', exact: true })).toBeVisible();
  // Validation: above the maximum is refused.
  await page.getByLabel('CAT 1 for Amina Nakato').fill('120');
  await page.getByLabel('CAT 1 for Amina Nakato').press('Tab');
  await expect(page.getByText('Maximum is 100')).toBeVisible();

  await page.waitForTimeout(600); // let the debounced save finish
  await page.reload();
  await expect(page.getByLabel('CAT 1 for Amina Nakato')).toHaveValue('80');
  await expect(page.getByRole('cell', { name: '67.5' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Deep Solve answers typed questions and keeps the conversation', async ({ page }) => {
  const server = await installFakeServer(page);
  await signIn(page);
  await page.goto('/#/solve');
  await page.getByLabel('Your question').fill('Calculate the dose for a 14 kg child');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('116.7 mg per dose.')).toBeVisible();
  expect(server.calls.some((c) => c.path === '/tutorpro/solve')).toBe(true);
  await page.reload();
  await expect(page.getByText('116.7 mg per dose.')).toBeVisible();
  await expect(page.getByText('Calculate the dose for a 14 kg child').filter({ visible: true }).first()).toBeVisible();
});

test('signed-in changes are saved to the cloud copy', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Covered on desktop');
  const server = await installFakeServer(page);
  await signIn(page);
  await page.goto('/#/settings?tab=data');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect.poll(() => server.cloud.rev, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(server.cloud.sha256).toMatch(/^[0-9a-f]{64}$/);
  const data = JSON.parse(server.cloud.data!);
  expect(data.schema).toBe(3);
});

test('AI features explain how to sign in when signed out', async ({ page }) => {
  await page.goto('/#/solve');
  await page.getByLabel('Your question').fill('Explain pharmacokinetics');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/Sign in to the DeepTutor server/)).toBeVisible();
});
