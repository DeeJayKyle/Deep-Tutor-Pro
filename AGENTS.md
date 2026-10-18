# Deep Tutor Pro development

This repository is a React 19 / TypeScript / Vite application. There is no Python tutor backend, WebSocket service, CLI, RAG engine, or cloud synchronization in this checkout. Do not assume those services exist from upstream DeepTutor documentation.

- Source: `src/`; state persistence: `src/services/storage.ts`.
- Runtime backup validators: `src/services/schemas.ts`, generated from `src/types/index.ts` using `npm run schemas`.
- Tests: `tests/` (Vitest), `e2e/` (Playwright desktop and mobile).
- Native wrappers: `packaging/windows` (Electron), `packaging/android` (Capacitor).
- Validate changes with `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, and `python3 scripts/check_workspace_hygiene.py`.
- Use a task branch/worktree; preserve existing user changes. Do not commit generated build output, installed dependencies, signing keys, or personal workspace data.
- Preserve saved data compatibility. Add regression tests for data loss, malformed imports, calculations, and crashes.
- Never label simulated AI, retrieval, OCR, diagnostics, signatures, or downloads as real. Keep demo limitations explicit.
- Installer builds are unsigned Windows and debug-signed Android test packages until signing is configured. Do not overwrite a published release as part of routine tests.
