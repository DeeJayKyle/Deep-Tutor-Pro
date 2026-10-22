import type { Page, Route } from '@playwright/test';

// A fake DeepTutor server for end-to-end tests: answers the /api/tutorpro,
// /api/companion and knowledge-base calls the app makes, records requests,
// and keeps a cloud copy for sync tests. Document reading, OCR, grading,
// storage and exports all run for real in the browser.

export const SERVER = 'https://tutor-companion.djrileykyle.workers.dev';

export interface FakeServer {
  calls: { path: string; body: unknown }[];
  cloud: { rev: number; sha256: string; data: string | null; device: string };
  failNext?: { path: string; status: number; detail: string };
}

const OUTLINE = {
  programme: { title: 'Certificate in Pharmacy', institution: 'Allied Health Examinations Board', award_level: 'Certificate', duration_years: 2, total_hours: 145, overview: 'Two-year programme for pharmacy assistants.', entry_requirements: '', assessment_policy: 'CA 40%, exam 60%' },
  classes: [],
  units: [
    { code: 'CP 111', title: 'Pharmaceutics I', year: 1, semester: 1, credit_units: 3, lecture_hours: 45, tutorial_hours: 0, practical_hours: 0, clinical_hours: 0, total_hours: 45, start_marker: 'CP 111 Pharmaceutics I' },
    { code: 'CP 112', title: 'Pharmacology I', year: 1, semester: 1, credit_units: 4, lecture_hours: 60, tutorial_hours: 0, practical_hours: 0, clinical_hours: 0, total_hours: 60, start_marker: 'CP 112 Pharmacology I' },
    { code: 'CP 211', title: 'Dispensing Practice', year: 2, semester: 1, credit_units: 3, lecture_hours: 40, tutorial_hours: 0, practical_hours: 0, clinical_hours: 0, total_hours: 40, start_marker: 'CP 211 Dispensing Practice' },
  ],
  model: 'Fake Gemini',
  truncated: false,
};

function unitDetail(title: string) {
  const topics: Record<string, [string, number][]> = {
    'Pharmaceutics I': [['Introduction to pharmaceutics', 6], ['Solutions and suspensions', 15], ['Tablets and capsules', 24]],
    'Pharmacology I': [['Principles of pharmacology', 10], ['Pharmacokinetics', 25], ['Pharmacodynamics', 25]],
    'Dispensing Practice': [['The prescription', 10], ['Labelling and counselling', 30]],
  };
  return {
    overview: `This unit introduces ${title.toLowerCase()}.`,
    aims: [],
    learning_outcomes: ['Apply the principles safely in practice'],
    topics: (topics[title] ?? [['General', 4]]).map(([t, h]) => ({ title: t, hours: h, objectives: [`Explain ${t.toLowerCase()}`], subtopics: [], practicals: '' })),
    teaching_methods: ['Lecture'],
    assessment: 'CAT and exam',
    references: [],
    hours_estimated: false,
    model: 'Fake Gemini',
  };
}

const q = (type: string, prompt: string, marks: number, extra: Record<string, unknown> = {}) => ({
  type,
  prompt,
  options: [],
  answer_index: null,
  answer: 'Model answer',
  solution: 'Worked solution.',
  marking_points: [{ point: 'Key point', marks }],
  marks,
  topic: 'Pharmacokinetics',
  difficulty: 'moderate',
  outcome: '',
  ...extra,
});

export async function installFakeServer(page: Page): Promise<FakeServer> {
  const state: FakeServer = { calls: [], cloud: { rev: 0, sha256: '', data: null, device: '' } };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': '*' } });

  await page.route(`${SERVER}/api/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    state.calls.push({ path, body });
    if (state.failNext && path === state.failNext.path) {
      const f = state.failNext;
      state.failNext = undefined;
      return json(route, { detail: f.detail }, f.status);
    }
    const b = (body ?? {}) as Record<string, any>;
    switch (path) {
      case '/tutorpro/auth/register':
        return b.username === 'taken' ? json(route, { detail: 'That username is taken. Choose another, or sign in.' }, 409) : json(route, { ok: true, token: 'new-token', username: b.username, role: 'user', auth: true }, 201);
      case '/tutorpro/auth/login':
        return b.password === 'secret' ? json(route, { ok: true, token: 'test-token', username: b.username, role: 'admin', auth: true }) : json(route, { detail: 'Incorrect username or password' }, 401);
      case '/tutorpro/status':
        return json(route, { api: '1.0', user: 'tutor', role: 'admin', providers: [{ id: 'gemini', label: 'Google Gemini', model: 'gemini-flash-latest' }], default_provider: 'gemini', ai_available: true, youtube_api: false });
      case '/tutorpro/curriculum/outline':
        return json(route, OUTLINE);
      case '/tutorpro/curriculum/unit':
        return json(route, unitDetail(b.unit?.title ?? ''));
      case '/tutorpro/notes':
        return json(route, {
          markdown: `# ${b.topic.title}\n\n## Learning objectives\n- ${b.topic.objectives?.[0] ?? 'Objective'}\n\n## Contact hour ${b.hour_start}: Introduction\nKey ideas explained clearly. [Source: S1]\n\n| Term | Meaning |\n|---|---|\n| ADME | Absorption, distribution, metabolism, excretion |\n\n## Summary of key points\n- Point one`,
          model: 'Fake Gemini',
        });
      case '/tutorpro/slides':
        return json(route, { markdown: '# Deck\n\n## Slide one\n- Bullet\nNotes: speak', model: 'Fake Gemini' });
      case '/tutorpro/revise':
        return json(route, { markdown: `${b.content}\n\n## Added by AI\n- Extra example`, model: 'Fake Gemini' });
      case '/tutorpro/exam-format':
        return json(route, { name: 'CP 112 past paper format', duration: '3 hours', instructions: 'Answer all questions in A and B, any two in C.', style_notes: 'Formal wording', sections: [{ title: 'Section A', type: 'mcq', count: 2, marks_each: 1, choose: 0, instructions: '' }, { title: 'Section C', type: 'essay', count: 3, marks_each: 20, choose: 2, instructions: '' }], model: 'Fake Gemini' });
      case '/tutorpro/assessment': {
        const sections = (b.sections as any[]).map((s) => ({
          title: s.title,
          type: s.type,
          instructions: s.instructions,
          choose: s.choose,
          questions: Array.from({ length: s.count }, (_, i) =>
            s.type === 'mcq'
              ? q('mcq', `MCQ ${i + 1}: Which describes bioavailability?`, s.marks_each, { options: ['Rate of excretion', 'Fraction reaching circulation', 'Half-life', 'Potency'], answer_index: 1 })
              : q(s.type, `${s.title} question ${i + 1}: Explain first-pass metabolism.`, s.marks_each),
          ),
        }));
        return json(route, { title: 'Paper', instructions: 'Answer all questions.', duration: b.duration, total_marks: 0, sections, model: 'Fake Gemini' });
      }
      case '/tutorpro/questions':
        return json(route, { questions: Array.from({ length: b.count }, (_, i) => q('short', `Bank question ${i + 1} on ${b.topic.title}`, 5)), model: 'Fake Gemini' });
      case '/tutorpro/solve':
        return json(route, { answer: `**Final answer:** 116.7 mg per dose.\n\nMode: ${b.mode}; images: ${b.images.length}; documents: ${b.documents.length}`, model: 'Fake Gemini' });
      case '/tutorpro/transcribe':
        return json(route, { text: 'What is pharmacodynamics?', model: 'Fake Gemini' });
      case '/tutorpro/sync/meta':
        return json(route, { rev: state.cloud.rev, updated_at: null, device: state.cloud.device, sha256: state.cloud.sha256, size: state.cloud.data?.length ?? 0 });
      case '/tutorpro/sync':
        if (req.method() === 'PUT') {
          if (b.base_rev !== state.cloud.rev && !b.force) return json(route, { detail: { message: 'conflict', rev: state.cloud.rev, device: state.cloud.device, updated_at: null, data: state.cloud.data } }, 409);
          state.cloud = { rev: state.cloud.rev + 1, sha256: b.sha256, data: b.data, device: b.device };
          return json(route, { rev: state.cloud.rev, updated_at: new Date().toISOString(), device: b.device, sha256: b.sha256, size: b.data.length });
        }
        return json(route, { rev: state.cloud.rev, updated_at: null, device: state.cloud.device, sha256: state.cloud.sha256, size: 0, data: state.cloud.data });
      case '/tutorpro/sync/history':
        return json(route, { items: [] });
      case '/knowledge-bases/list':
        return json(route, [{ name: 'pharmacology_year1', status: 'ready', statistics: { raw_documents: 3 } }]);
      case '/companion/research':
        return json(route, { results: [{ title: 'Pharmacokinetics review', url: 'https://example.org/pk', provider: 'OpenAlex', date: '2024-01-01', summary: 'A review.' }], notes: [] });
      default:
        return json(route, { detail: `Not faked: ${path}` }, 404);
    }
  });
  return state;
}

export async function signIn(page: Page): Promise<void> {
  await page.goto('/#/settings');
  await page.getByLabel('Username').fill('tutor');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByText('Signed in', { exact: true }).waitFor();
}
