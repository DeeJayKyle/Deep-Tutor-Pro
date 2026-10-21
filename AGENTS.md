# Deep Tutor Pro development

React 19 / TypeScript / Vite 6 / Tailwind 4 app for Windows (Electron), Android (Capacitor) and the web. AI, knowledge bases and cloud sync are provided by the DeepTutor server (`/api/tutorpro`, `/api/companion`, `/api/knowledge-bases` in DeeJayKyle/DeepTutor); everything else runs on the device.

- Data model: `src/lib/model.ts`; tolerant loader and 1.x migration: `src/lib/workspace.ts` (`normalizeWorkspace`, `migrateLegacy`). Storage: IndexedDB via `src/lib/db.ts`, store in `src/state/store.ts`.
- Server client: `src/lib/api.ts` (bearer token from `/api/tutorpro/auth/login`). Sync: `src/lib/sync.ts` (revisioned cloud copy, conflict review, merge).
- Tests: `tests/` (Vitest), `e2e/` (Playwright desktop and mobile, fake server in `e2e/fake-server.ts`).
- Validate changes with `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, and `python3 scripts/check_workspace_hygiene.py`.
- Use a task branch; preserve existing user changes. Do not commit generated build output, installed dependencies, signing keys, `public/vendor/` (copied by `scripts/vendor-assets.mjs`) or personal workspace data.
- Preserve saved data compatibility: every saved/synced/restored workspace passes through `normalizeWorkspace`. Add regression tests for data loss, malformed imports, calculations, and crashes.
- Never label AI output as reviewed or final until the tutor approves it; never present simulated results as real. API keys must never reach the client.
- Releases: `release.yml` builds and publishes; never overwrite a published release (v1.6.14 is protected) as part of routine tests.
