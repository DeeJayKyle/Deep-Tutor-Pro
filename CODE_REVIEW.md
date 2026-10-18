# Application review — 2026-10-18

The checkout contains a browser-local React application with 20 screens, rather than the Python/server architecture described in the inherited documentation. Review covered the source tree, persistence, handlers, native packaging, dependency installation, and all workflow definitions.

## Repaired defects

- Fresh checkout build failed because the initial data module was absent and `data/` was globally ignored. Initial defaults and lockfiles are now tracked; assets use relative URLs for native wrappers.
- Partners crashed with an empty workspace. Regression navigation covers all 20 views with fresh and sample data.
- Backups omitted drafts, providers, selected tools and workspace name. All 17 stores now round-trip; runtime schemas validate nested data before any write. Legacy v2 backups remain supported. Quota failures attempt rollback and report failure. Reset touches only this application's keys.
- Storage failures were silently swallowed. The app now displays an unsaved-data alert.
- Grade inputs allowed out-of-range and nonfinite scores. Totals and grade boundaries are centralized. CSV fields now escape quotes/newlines and neutralize formulas. Duplicate student registration numbers are rejected.
- Switching course units could show another course's notes or exam. Content is scoped to the selected course. Sample paper totals now match actual questions.
- Release buttons created text masquerading as EXE/APK files, referenced the wrong repository, and simulated publishing. Links now point to actual v1.6.14 assets; production signing and cloud-sync claims were removed.
- A fabricated checksum was labelled SHA-256 and plain backups were labelled encrypted. The checksum now uses Web Crypto and the UI accurately describes plain JSON.
- Document upload fabricated extracted text; supported text files are now read, bounded by size, and unsupported formats report a clear limitation. Reference sizes reflect the actual file.
- Fake provider diagnostics, voice transcription, retrieval results and fabricated research metadata were removed. Chat now reports that no provider is connected. Demo content is labelled across the application.
- Markdown exports no longer masquerade as Word documents. Temporary download URLs are released.
- A collapsible navigation menu makes the workspace usable at phone widths.

## Remaining product work

The existing solvers, research pipeline, question/lecture/exam generators, co-writer AI actions, reading answers, mastery scores and partner responses are illustrative demonstrations. They are not implemented AI services. Template content can be unrelated to a changed prompt. Sample medical content has not undergone clinical review and must not be used for clinical decisions or unreviewed teaching.

Implementing these capabilities requires a real backend, provider configuration, authenticated requests, real document parsing/retrieval and a defined error/streaming contract. This review does not add credentials or invent those services. Live integration tests cannot pass until those services exist.

PDF/Office/image parsing, OCR, audio transcription, PWA caching, cloud synchronization, native signing and real-device installer testing remain absent. Some demo controls are presentation-only. Word/PowerPoint exports are text/outline exports rather than native Office files. Workspaces are labels over one local data store, not isolated accounts.

Browser-local persistence remains subject to browser/device storage eviction. A backup spans multiple localStorage keys: rollback is best effort if the storage system itself becomes unavailable. Keep exported backups for important records.

## Validation

Automated checks cover nested backup validation, legacy imports, rollback, unrelated-storage preservation, grade boundaries, CSV escaping, actual installer links, course filtering, all screens, desktop/mobile navigation and persistence across reload. GitHub Actions publishes HTML/trace artifacts on browser-test failure. Native build checks compile real Windows and Android artifacts; they do not prove installation on physical devices.
