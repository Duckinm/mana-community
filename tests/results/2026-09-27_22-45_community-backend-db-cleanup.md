# QA Report — Community backend and database cleanup — 2026-09-27T22:45:00+07:00

Working tree on `codex/selfhost-availability`, based on `9a01a49`. Bun 1.3.10. Synthetic test database only; no user installation records modified by these backend tests.

## TypeScript

- apps/api: PASS — `bun x tsc --noEmit --project apps/api/tsconfig.json` after removing obsolete subscriptions/rewards and resolving the dependency-install race.
- apps/web: PASS — coordinator verified the combined frontend/backend contracts.
- An intermediate check ran while dependency installation changed Drizzle peer instances and produced duplicate private-type errors. Coordinator restored the pinned prior dependency versions; final API check passed without suppressions.

## Provider Tree

- Unchanged by this backend work; API response changes coordinated with the frontend implementer.

## Visual

- Light theme: coordinator owns browser verification.
- Dark theme: coordinator owns browser verification.
- No standalone backend visual claim.

## API / E2E

- Fresh isolated PostgreSQL 16.15 database: all 44 journaled migrations applied. Historical SQL and snapshot hashes remain unchanged (independent reviewer checked all 84 tracked migration files).
- Regression red: before editing, a community-access assertion failed because the Cloud/default branch returned one project, 1 GiB, ten document sends, one calendar and forced branding. The obsolete shared pricing/entitlement module was then removed, and persisted-state integration coverage replaced the temporary assertion.
- `self-hosted-core.test.ts`: PASS, 16 assertions. A synthetic account creates its second project, retains storage metadata above 1 GiB, records AI action 1101 and slip verification 31 without limits, releases unsuccessful AI usage, saves its profile and branding preference, and never grants/consumes historical reward credits. Public account responses omit subscription/reward data.
- `community-api-surface.test.ts`: PASS, 395 assertions. Actual Elysia route registration retains projects and resource usage, excludes Cloud CMS/landing/operator endpoints, and POST requests to checkout, portal and billing webhook return 404. Auth handler wildcard mounts are excluded from registry enumeration and tested through requests.
- `public-document-access.test.ts`: PASS, nine tests. The former Free-plan forced-branding expectation was replaced with the requested user-controlled branding behavior; ownership and public-link lifecycle assertions remain.
- Database package: PASS, 16 tests / 28 assertions (`bun test packages/db`).
- Email catalog snapshot intentionally removes only the eight deleted subscription template entries; the remaining rendering/escaping tests pass.
- Seed guard: invoking the optional demo without `--email` refuses before writing data. Fixed argument parsing so a missing flag cannot treat the executable path as an email.
- Final API suite: PASS, **333 tests across 77 files**, zero failures. Each file used a separate Bun process to prevent test mock leakage, against the isolated database and synthetic environment. This includes the final MCP configured-host regression, actual API registry test and revised branding assertions.

## Database audit

- `packages/db/src/schema/` is the current application schema. The six retired Cloud schema modules are in `src/legacy-schema/` and no longer exported by the application package. Drizzle generation still includes them so migration generation will not propose dropping installed data.
- Deleted the Cloud CMS seed. Retained the optional application demo seed; its seven literal email examples are reserved example domains, and its generated contacts use example domains. It does not create auth passwords/accounts/provider credentials and is not called by installation.
- Scanned database source, SQL and JSON for credential patterns and email literals: no provider-key/token pattern matches. One non-example account identifier remains in the historical owner-promotion migration. Its original hash is preserved and the migration runner already explicitly skips its account-promotion statements. This audit does not claim historical SQL is Cloud-free.
- Subscription/reward columns on `users` and `plan_archived_at` on projects remain for upgrade compatibility. Community code does not use them for access, charging, rewards or automatic archiving. No cleanup migration drops data or tables.
- Added `packages/db/README.md` to explain runtime schemas, legacy schema retention, demo data and migration integrity.

## Notes

- Removed Stripe checkout/webhooks/auth plugin/price scripts/dependencies, subscription pricing matrices, reward mutations, plan enforcement and upgrade tool copy. Usage counts and AI token-cost estimates remain observational. The existing `/api/billing/usage` URL is retained for the resource-usage screen; it offers no payment operations.
- Core invoice/accounting/payment records and email delivery remain. Upload size limits, request rate limiting, auth/ownership checks and the public-slip abuse limit remain; these are operational safeguards, not paid tiers.
- Removed obsolete feature-specific tests alongside the deleted Cloud features. No retained test was relaxed to hide a runtime failure.
- Paid provider calls were not exercised. Provider credentials/configuration and external service costs still apply.
- Some publication tests deliberately tolerate PDF rendering failure and logged a missing native Playwright browser executable; their passing unit tests are not proof of native PDF generation. Coordinator browser/runtime checks own PDF verification.
- No commit, push or merge performed by this implementation agent.
