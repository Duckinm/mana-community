# QA Report — public export code checks — 2026-09-26T10:10:50+07:00

## TypeScript

- apps/web: PASS — `bunx tsc --noEmit`, zero errors.
- apps/api: PASS — `bunx tsc --noEmit`, zero errors.
- packages/db: PASS — `bunx tsc --noEmit`, zero errors.
- packages/ui: PASS — `bunx tsc --noEmit`, zero errors.
- All commands used the pinned Bun 1.3.10 runtime. The host's default Bun was not used for these checks.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- PASS — static inspection of provider composition. Root wraps the app in QueryClientProvider, ThemeProvider, LanguageProvider, and SessionProvider. The authenticated layout supplies TooltipProvider, MotionConfig, SettingsProvider, ContactsProvider, ProjectsProvider, and SidebarProvider.
- This is source inspection, not evidence that every provider behavior rendered successfully in a browser.

## Visual

- Light theme: NOT RUN in this code-test pass.
- Dark theme: NOT RUN in this code-test pass.
- No visual approval or browser acceptance is claimed by this report; use the separate Docker/browser acceptance report for those results.

## API / E2E

| Check | Result |
| --- | --- |
| Web — `bun run test` in apps/web | PASS: 32 files, 71 tests |
| Shared database package — `bun --no-env-file test` in packages/db | PASS: 3 files, 19 tests, 39 assertions |
| CI boundaries and license inventory — `bun --no-env-file test tests/ci/workflows.test.ts tests/ci/license-inventory.test.ts` | PASS: 2 files, 4 tests, 63 assertions |
| Fresh database — `bun --no-env-file packages/db/migrate.ts` | PASS: 44 applied migrations, zero previously recorded |
| API — one `bun --no-env-file test <file>` process for each sorted src/**/*.test.ts file | PASS: 90 files, 423 passing tests, zero failures, 1,588 assertions; 9 TODOs and one conditional skip |
| Production CORS — `NODE_ENV=production bun --no-env-file test src/lib/cors-origins.test.ts` | PASS: production branch exercised; development-only branch intentionally skipped |
| Full Docker signup, mail, storage, PDF, restart, backup/restore browser acceptance | NOT RUN by this tester; separate acceptance evidence required |

API tests used a new disposable PostgreSQL 16.15 Alpine container with a dynamically assigned loopback port, synthetic credentials, and an empty `mana_ci` database. No existing database, developer environment file, or real provider credential was used. The runner followed CI's file-isolation rule to avoid Bun module-mock leakage, used dummy provider values, and continued through all files to preserve failures. The disposable database container and its anonymous volume were removed after the run.

### Limitations and findings preserved

- Nine API TODO placeholders remain: four auth endpoint cases and five user endpoint cases. They are not passing coverage. Separate acceptance exercises some overlapping workflows but does not complete these TODOs.
- The normal API run skipped the production-only CORS case by design. The additional production-mode run exercised that branch successfully.
- `publish-document.test.ts` passed its publication/email assertions while its asynchronous PDF task logged missing Chromium. These tests do not assert successful PDF generation and must not be cited as PDF acceptance. The real self-hosted PDF smoke remains necessary.
- `mcp-tools-reconciliation.test.ts` passed its eight assertions but logged an asynchronous `activity_logs` foreign-key violation after a fixture user was removed. Passing reconciliation assertions do not establish that this background audit-log task completed successfully. This cleanup/background-task race remains unresolved in this pass.
- No test assertions were weakened, retries added, or source files changed by this tester.

## Notes

- Candidate: new public-export working tree, with no committed revision available at test time. This report applies to that inspected working tree, not the private repository's previously tested commit.
- Tested lockfile SHA-256: `a7ac6158a3b1ea9844d38c1a36d1f55dbe0776d89af3faaf9f33fa6d76f7dfba`.
- Platform: macOS Apple Silicon for code tests, Docker PostgreSQL for API integration. This is not proof of a GitHub-hosted Linux CI run.
- Test implementation, reviewer agreement, and this report do not authorize merging or publication. Required CI must run on the actual candidate; material code changes require fresh relevant evidence.
