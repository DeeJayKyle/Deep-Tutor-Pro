# Contributing

Create a feature branch from `main` and submit a pull request to `main`.
This repository contains a standalone React app, not the upstream Python DeepTutor service.
Use Node.js 22. Run:

```sh
npm ci
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
python3 scripts/check_workspace_hygiene.py
```

When changing data types, run `npm run schemas` and commit the generated validators.
GitHub Actions runs the same checks. Keep generated installers, build output, and dependencies out of Git.
Use descriptive commits (`fix:`, `test:`, `docs:`, `build:`). Add regression coverage for functional changes.
See `CODE_REVIEW.md` for known limitations and the scope of the application review.
