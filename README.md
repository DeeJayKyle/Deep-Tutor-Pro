# DeepTutor — React Web Application

DeepTutor is an agent-native intelligent learning companion rewritten as a modern React and TypeScript application. It connects tutoring, multi-stage problem solving, Bloom-aligned question generation, dynamic research literature reviews, mathematical visualizations, mastery tracking, and the Tutor Companion suite.

## Architecture

The system is organized around DeepTutor's two-layer plugin architecture:

### Level 1 — Single-Shot Tools
- `web_search`: Real-time web retrieval with citations
- `paper_search`: arXiv preprint search for academic proofs
- `reason`: Dedicated deep-reasoning chain-of-thought exploration
- `brainstorm`: Breadth-first idea exploration with rationale
- `geogebra_analysis`: Analyze math & geometry into GeoGebra
- `imagegen`: Generate concept illustrations & charts
- `rag`: Retrieve context from attached knowledge bases

### Level 2 — Multi-Stage Capabilities
- **Tutor Chat**: Agentic Socratic dialogue with collapsible reasoning thought traces, tool execution badges, and grounding citations
- **Deep Solve**: Multi-stage formal mathematical & conceptual solver (Invariant Analysis → Decomposition → Scratchpad Derivation → Verification)
- **Deep Question**: Bloom taxonomy-aligned question generator (quizzes, exam problems, and conceptual probes) with direct sync to the Question Bank
- **Deep Research**: Multi-source dynamic topic queue scheduler with synthesized executive findings and real preprint citations (arXiv, OpenAlex)
- **Visualize**: Interactive architecture diagrams, singular value scree plots, and ill-conditioned loss contours
- **Math Animator**: Real-time Fourier series square-wave synthesis canvas with odd harmonic basis functions and playback controls
- **Mastery Path**: Guided curriculum tree, prerequisite gating, skill competency radar, and milestone challenges
- **Immersive Reading**: Split-screen document (PDF/EPUB) and video reader with timestamped grounded notes and citation Q&A
- **Co-Writer**: Academic paper drafting workbench with outline navigation, AI edit agent, and Markdown export

### Learning Spaces & Tools
- **Task Board**: Workspace Kanban board (To Do, In Progress, Done) with priority tags and move controls
- **Question Bank & Notebook**: Curated question repository with interactive Practice Test mode, live grading, and explanations
- **Three-Layer Memory Workbench**: Inspectable memory graph connecting Layer 1 (Episodic Traces), Layer 2 (Learner Traits), and Layer 3 (Cognitive Synthesis)
- **Knowledge Center**: Multi-engine knowledge base manager (LightRAG, LlamaIndex, PageIndex, Obsidian) with document viewer and RAG chunk retrieval tester
- **Partners & Subagents**: Roster of autonomous tutor companions across Slack, Discord, Telegram, and CLI with a live interactive chat simulator
- **Tutor Companion**: Academic class manager, teaching materials generator (lecture notes, exam papers, marking guides), real index research lookup, and offline backups with SHA-256 verification
- **Settings & Doctor Diagnostic**: Model provider picker, reasoning effort gating, and `deeptutor doctor` readiness audits

## Running the App

```bash
npm install
npm run dev
```

The application runs on Vite on port 3000.
