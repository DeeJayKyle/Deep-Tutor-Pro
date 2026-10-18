# DeepTutor: Institutional Curriculum Engineering & Student Management System

A unified academic platform empowering educational institutions, tutors, and students to import full curricula (e.g. Diploma/Certificate in Pharmacy), analyze syllabus guidelines, automatically decompose them into classes, course units, and contact-hour lecture notes with reference citations, generate 3-tier standard exams and assignments with marking rubrics, maintain multi-year student biodata and grade ledgers, solve tasks with multimodal inputs (voice notes, images, documents), and operate seamlessly online or offline across Windows PCs and Android devices.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been established based on your clarified requirements:
> - **Workspace Starting State**: Initialized as a clean, blank workspace ready for uploading your custom curriculum (with an optional one-click preset loader for Pharmacy curricula).
> - **Assessment Paradigm**: Standardized 3-tier examination structure (Section A: Multiple Choice Questions, Section B: Short Answer Questions, Section C: Long Essay Questions + comprehensive Marking Scheme).
> - **Student Records & Cohorts**: Systematic organization by academic years of study (Year 1, Year 2, Year 3) tracking biodata, continuous assessment tests (CATs), practicals, and final examinations with full user editability.
> - **Multimodal Solving**: Deep Solve augmented with audio voice-note recording, image OCR upload, and document attachment processing.
> - **Export Capability**: Lecture notes and assessments formatted for one-click download in Presentation (PPT/Slide Deck), Document (DOCX/Word), and Print/PDF formats.

---

## 1. Overview & Core Concept

### What It Delivers
The enhanced DeepTutor transforms from an individual study assistant into a full institutional academic curriculum engine and tutor management suite:
1. **Curriculum Analyzer & Decomposer**: Upload comprehensive syllabus documents (PDF, DOCX, TXT, or scan images). The system parses total contact hours, modular topics, practical hours, and learning objectives, automatically creating structured course units.
2. **Reference-Grounded Lecture Notes**: Upload textbooks, clinical guidelines, research papers, and images. The note generator synthesizes modular lecture notes partitioned strictly by contact-hour blocks, providing genuine inline reference tags and exportable formatted documents (PowerPoint outline, Word document, and PDF).
3. **Assessment & Question Bank Engine**: Generates continuous assessment tests (CATs), assignments, and standard 3-tier examination papers (MCQs, short answer, and long essay) complete with point-by-point marking schemes, learning outcomes assessed, and difficulty weighting. Users can hand-pick topics or upload previous exam papers as structural benchmarks.
4. **Student Biodata & Grade Ledger**: A multi-year academic gradebook capturing student biodata (registration number, full name, cohort year, contact, guardian information, attendance status) and a tabular marks ledger supporting continuous assessments, coursework, exams, GPA calculation, and CSV/Excel import-export.
5. **Multimodal Deep Solve Chat**: Deep Solve supports text queries, recorded audio voice notes, diagram/formula snapshots, and document excerpts.
6. **Offline-First & Cross-Platform (Windows & Android)**: Full local persistence via IndexedDB/LocalStorage, working with or without internet, coupled with responsive touch-first ergonomics ($44\text{px}$ touch targets, responsive bottom tabs on mobile, multi-column desktop layout on Windows).

---

## 2. User Experience & Visual Design

### Key User Flows

```
[ Upload Curriculum / Guide ] 
              ↓
  Automated Deconstruction & Extraction
  • Contact Hours Allocation
  • Learning Objectives & Competencies
  • Course Units per Academic Year
              ↓
[ Course Unit Workspace ] ───→ [ Upload Reference Materials ]
              ↓                               ↓
  Lecture Notes Generation (by Contact Hour) with Grounded Citations
  • Export: PPT Slide Deck | Word (DOCX) | Print PDF
              ↓
[ Assessment Engine ]
  • Topic Selector & Format Mode (3-Tier Standard Exam / CAT / Assignment)
  • Optional: Upload Reference Exam Standard
  • Output: Exam Paper + Detailed Marking Scheme + Solution Bank
              ↓
[ Student Gradebook & Biodata ]
  • Cohorts (Year 1, Year 2, Year 3)
  • Marks Tracking (Assignments, Coursework, Exams)
  • Biodata Management & CSV Export
```

### Visual Identity & Theme
- **Color Architecture**:
  - Dominant Canvas: Deep obsidian slate (`#0B0F19`) providing high-contrast readability without eye strain during long academic planning sessions.
  - Structural Panels & Dividers: Clean hairline borders (`#1E293B`) and elevated cards (`#121826`).
  - Semantic Academic Accents:
    - Primary Clinical Blue (`#3B82F6`): Course units, curriculum decomposition, and primary actions.
    - Emerald Green (`#10B981`): Learning outcomes achieved, passing marks, and verified citations.
    - Amber/Gold (`#F59E0B`): Continuous assessment tests, contact hours tally, and flagged student risks.
    - Purple/Indigo (`#8B5CF6`): Multi-stage Deep Solve and exam generation.
- **Typography & Formatting**:
  - Headings: Clean, modern display typography with crisp weights (600/700) for course titles and unit codes.
  - Body & Formulas: High-legibility sans-serif paired with monospace fonts for mathematical derivations and drug dosage formulas.
  - Zero-Pill Discipline: Metadata (contact hours, unit codes, credit units, timestamps) displayed with unboxed typographic separators (`·` or `/`) instead of visual clutter.
- **Responsive Layout & Touch Ergonomics**:
  - Desktop / Windows PC: Full three-pane master-detail layout (Curriculum tree on left, active unit/lecture notes in center, reference materials & student quick-roster on right).
  - Android / Mobile: Adaptive bottom navigation bar with $44\text{px}$ touch targets, slide-up drawers for reference attachments, and touch-optimized grade inputs.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Blank Starting State with Instant Sample Injection
- **Approach**: The app opens to a clean, focused "Curriculum Importer" zero-state. For users wanting to test immediately without having a curriculum PDF on hand, an inline "Load Sample: Diploma in Pharmacy" action is provided to populate Year 1 & 2 pharmacy course units (Pharmacology, Pharmaceutics, Pharmacognosy, Pharmaceutical Chemistry).
- **Rationale**: Honors your direct preference for a blank workspace while ensuring zero setup friction.

### Decision 2: 3-Tier Exam Standard with Topic Checklists
- **Approach**: When generating assessments, tutors can toggle individual topics to test, set total marks, and select the exam tier:
  - **Standard Exam**: Section A (20 Multiple Choice Questions), Section B (5 Short Answer Questions), Section C (2-3 Long Essay Case Scenarios) with complete marking rubrics.
  - **Coursework / Assignment**: Focused scenario-based tasks with deliverables and rubrics.
  - **Upload Reference Exam**: Allows the tutor to provide a past paper sample to mirror its exact mark distributions and phrasing conventions.
- **Rationale**: Matches official institutional assessment guidelines for vocational and tertiary diploma/degree programs.

### Decision 3: Client-Side Offline Persistence & Document Exporters
- **Approach**: Store all curricula, lecture notes, student biodata, marks, and reference materials in structured local storage with JSON snapshot export/import and SHA-256 validation. Provide native client-side export to:
  - Markdown/Word-ready formats (`.docx` formatting structure)
  - Slide Presentation outline (`.pptx` ready format)
  - Print-ready HTML/PDF formatting
- **Rationale**: Guarantees tutors can work inside classrooms, clinical wards, or rural health facilities without steady internet connection, syncing when connectivity resumes.

---

## 4. Technical Architecture & Data Strategy

### System Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DeepTutor Unified App Shell                     │
│   (Responsive Navigation: Desktop Sidebar + Mobile Bottom Tab Bar)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Curriculum & Notes   │  │ Assessment & Exams   │  │ Student Ledger       │
│ • Syllabus Importer  │  │ • 3-Tier Exam Maker  │  │ • Multi-Year Cohorts │
│ • Unit Decomposer    │  │ • Topic Selector     │  │ • Biodata Form       │
│ • Contact Hour Plan  │  │ • Marking Scheme     │  │ • Gradebook / CATs   │
│ • PPT/PDF/Word Export│  │ • Reference Benchmark│  │ • CSV Import/Export  │
└──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Multimodal Deep Solve & Assistant                   │
│   • Typed Questions   • Voice Audio Notes   • Attached Images/Docs     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Offline-First Local Storage Engine                  │
│    Curricula • Course Units • Lecture Notes • Question Bank • Students │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Entities & Data Models
1. **`CurriculumPackage`**: ID, title (e.g. Diploma in Pharmacy), institution, durationYears, totalHours, rawOverview, courseUnits (`CourseUnit[]`).
2. **`CourseUnit`**: ID, code (e.g. PHA 1101), title, yearOfStudy, semester, contactHours (lectureHours, tutorialHours, practicalHours), objectives, topics (`UnitTopic[]`), referenceIds.
3. **`UnitTopic`**: ID, topicNumber, title, allocatedHours, lectureNotes (content, slideOutlines, summary, keyFormulas, referenceExcerpts).
4. **`AssessmentPaper`**: ID, courseUnitId, kind (`standard_exam` | `coursework` | `assignment`), title, duration, totalMarks, sections (`ExamSection[]`), markingScheme, solutionBank.
5. **`StudentBiodata`**: ID, regNumber, fullName, yearOfStudy, gender, dateOfBirth, contactPhone, email, guardianName, guardianPhone, status.
6. **`GradeRecord`**: studentId, courseUnitId, academicYear, cat1Mark, cat2Mark, courseworkMark, practicalMark, finalExamMark, totalMark, grade, remarks.
7. **`ReferenceDocument`**: ID, name, fileType, size, extractedText, images, attachedUnitIds, uploadedAt.

---

## Verification & Execution Roadmap
1. **Curriculum Engine**: Complete syllabus ingestion workflow, automated course unit creation, contact hour sorting, and document text extraction.
2. **Lecture Notes & Reference Pipeline**: Generates modular notes linked to uploaded references with PPT, Word, and PDF download formats.
3. **Standard 3-Tier Assessment Generator**: Topic selection, exam paper builder (MCQs, short answer, essays), marking guides, question banks, and reference exam benchmarking.
4. **Student Biodata & Gradebook Ledger**: Multi-year student database with editable records, marks calculation, and CSV backup.
5. **Multimodal Deep Solve**: Audio voice recording, image/formula snapshots, and step-by-step reasoning.
6. **Cross-Platform Responsive Polish**: Tested on Windows PC wide-screen and Android mobile viewport with full offline capability.
