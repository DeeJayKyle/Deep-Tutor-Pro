# Deep Tutor Pro

**From curriculum to marks sheet — one app for lecturers.** Import a full curriculum or teacher’s guide (for example *Diploma in Pharmacy* or *Certificate in Pharmacy*) and Deep Tutor Pro builds the classes, course units, outlines, learning objectives and contact hours. Then write lecture notes by contact hour from your own references, set exams and coursework with marking schemes, keep a question bank with solutions, record students’ biodata and marks by year of study, and solve any question with Deep Solve.

Windows · Android · Web — works offline, syncs when online.

## What it does

| Area | Features |
| --- | --- |
| **Curriculum** | Upload a curriculum (PDF, scanned PDF, Word, PowerPoint, photos). AI analysis finds the programme, years, semesters, course units, credits and contact hours; you review and edit before anything is created. A class is made for each year of study. Each unit’s topics, contact hours and learning objectives are extracted in the background. |
| **Classes & units** | Fully editable outlines: topics with contact-hour numbering (Hours 1–6, 7–21…), objectives, subtopics, practicals, aims, outcomes, teaching methods, references. |
| **Reference library** | Textbooks, guidelines, past papers, slides and photos. Text is read on the device: PDF text layer, OCR for scanned pages and images (Tesseract), Word, PowerPoint, Excel, OpenDocument, HTML, RTF. Link references to units. |
| **Lecture notes** | Generated per topic, organised by contact hours and grounded in the unit’s references (`[Source: S#]` tags). Edit side by side, revise with AI (with undo), approve as final. Export to **Word, PDF, PowerPoint**, or an AI-condensed slide deck. |
| **Exams & coursework** | Exams, CATs, assignments, quizzes, practicals. Choose the topics and the format — standard (MCQ + short answer + long essay), CAT, assignment, or your own sections — or upload a reference exam and copy its format and style. Every question has a marking scheme and model answer. Export the paper and the marking scheme to Word or PDF. |
| **Question bank** | Questions with worked solutions per unit and topic: AI-generated, collected from papers, or your own. Build papers from the bank; export with or without answers. |
| **Students & marks** | Classes by year of study, full biodata, import/export class lists (Excel/CSV), marks per course unit for each assessment component (CATs, assignments, practicals, exam) with configurable weights and grade bands, rankings, statistics, results summaries, GPA and transcripts. Promote a class to the next year. |
| **Deep Solve** | Step-by-step solutions from typed questions, photos of questions, attached documents or voice notes; explain mode; script-marking mode. Save answers as notes. |
| **Tutor chat & Deep Research** | DeepTutor’s agents with web search and your knowledge bases; multi-step research reports with sources; real articles, images and videos (OpenAlex, arXiv, Wikimedia Commons, YouTube). |
| **Knowledge bases** | Turn library documents into searchable knowledge bases on your DeepTutor server. |
| **Sync & backup** | Everything is stored on the device (IndexedDB). Signed in, it syncs to your private cloud copy; edits from two devices are reviewed and combined, never silently overwritten; earlier cloud versions can be restored. Backup files carry a SHA-256 checksum. |

Hyperlinks connect everything: a topic links to its notes and bank questions, a paper to its unit and marks sheet, a student to their marks, and so on.

## AI and the server

AI runs on your **DeepTutor server** ([DeeJayKyle/DeepTutor](https://github.com/DeeJayKyle/DeepTutor), `/api/tutorpro`), which holds the API keys — the apps never see them. Gemini is used by default and OpenAI as soon as `OPENAI_API_KEY` is set on the server; switch in **Settings › AI provider**. Sign in under **Settings › Account & server** (default server: `https://tutor-companion.djrileykyle.workers.dev`). The web app is also served from that address at `/pro/`.

Without signing in, everything except AI, knowledge bases and cloud sync works on the device. AI output is always marked as a draft until you approve it.

## Development

Node.js 22.

```bash
npm ci
npm run dev          # http://localhost:3000
npm run lint         # TypeScript
npm test             # Vitest unit tests
npm run build
npm run test:e2e     # Playwright, desktop + phone (set PW_CHROMIUM to use a pre-installed Chromium)
python3 scripts/check_workspace_hygiene.py
```

- `src/lib/` — engines: data model and migration, extraction/OCR, exporters, grading, curriculum, papers, sync, server client.
- `src/state/` — workspace store (IndexedDB, autosave, sync), router, background AI jobs.
- `src/views/`, `src/ui/` — screens and components.
- `e2e/` — end-to-end tests with a fake DeepTutor server and real PDF/Word fixtures (`scripts/make_fixtures.py`, `scripts/make_docx_fixture.mjs`).
- `packaging/windows` (Electron, `app://tutor-pro`), `packaging/android` (Capacitor).
- `.github/workflows/ci.yml` (checks) and `release.yml` (Windows installer, Android APK, web zip, GitHub release).

## Licence

Apache-2.0. See `THIRD_PARTY_NOTICES.md` for bundled libraries.
