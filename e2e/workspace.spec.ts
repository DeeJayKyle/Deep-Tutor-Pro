import { test, expect } from '@playwright/test';
const screens = ['Curriculum & Units','Lecture Notes','Exams & Coursework','Students & Gradebook','Reference Library','Tutor Chat','Deep Solve','Deep Question','Deep Research','Visualize','Math Animator','Mastery Path','Immersive Reading','Co-Writer','Task Board','Question Bank','Memory Graph (3-Layer)','Knowledge Bases','Partners & Subagents','Tutor Companion'];
async function navigate(page, name: string) {
  const menu = page.getByRole('button', {name:'Open navigation',exact:true});
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('complementary').getByRole('button',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
}
test('every screen renders with no page errors on fresh install', async ({page}) => {
  const errors: string[]=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/');
  for(const name of screens) {
    await navigate(page,name);
    await expect(page.locator('main')).not.toHaveText('');
  }
  expect(errors).toEqual([]);
});
test('task creation survives reload', async ({page}) => {
  await page.goto('/'); await navigate(page,'Task Board');
  await page.getByRole('button',{name:/New Task/}).click();
  await page.getByPlaceholder('e.g. Derive Backpropagation Equation 3').fill('Regression study task');
  await page.getByRole('button',{name:/Add Task/}).click();
  await expect(page.getByText('Regression study task')).toBeVisible();
  await page.reload(); await navigate(page,'Task Board');
  await expect(page.getByText('Regression study task')).toBeVisible();
});
test('release links point to published assets', async ({page}) => {
  await page.goto('/');
  const menu=page.getByRole('button',{name:'Open navigation',exact:true});if(await menu.isVisible())await menu.click();
  await page.getByRole('button',{name:/EXE & APK Release Hub/}).click();
  await expect(page.getByRole('link',{name:'Download Windows installer'})).toHaveAttribute('href',/\/v1\.6\.14\/Deep-Tutor-Pro-1\.6\.14-Windows-x64-Setup\.exe$/);
  await expect(page.getByRole('link',{name:'Download Android APK'})).toHaveAttribute('href',/Android-test\.apk$/);
});
