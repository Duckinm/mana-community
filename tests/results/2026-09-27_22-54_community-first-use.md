# QA Report — Community first use — 2026-09-27T22:54:00+07:00

## TypeScript

- apps/web: PASS — Bun 1.3.10, final source including provider-aware linked accounts.
- apps/api: PASS — final backend and MCP host validation changes.
- packages/db and packages/ui: PASS.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- PASS — session/auth guard, TooltipProvider, MotionConfig, SettingsProvider, ContactsProvider, ProjectsProvider and SidebarProvider retained. Removed only the paid-usage nudge. Draft profile data is cleared only after persistence succeeds.

## Visual

- Light theme: PASS — Home and usage checked in local running application, including Thai Home at 390 × 844.
- Dark theme: PASS — Home, usage, branding control and provider-aware linked accounts checked through computer use.
- Signed-in root opens Home; completed onboarding opens existing lists; mobile primary action is Home. Original English/dark preferences and default viewport restored.
- Google, Discord and Facebook Connect controls are disabled without credentials, with a persistent explanation. Existing account unlink behavior is covered by component tests.
- Old billing bookmark redirects to Usage. No plan selector, checkout or reward credit remains.

## API / E2E

- Web: PASS — 101 tests across 41 files, including new-user/partial/completed Home states, navigation, free usage and provider availability.
- API: PASS — 333 tests across 77 files, each in a separate Bun process against an isolated synthetic database. See backend report.
- Database: PASS — 16 tests / 28 assertions; fresh replay of 44 migrations.
- Workflow/license checks: PASS — four tests / 65 assertions.
- Native production web build and API Docker build: PASS. Local web runtime image assembled from that native build using the unchanged production Docker stage; this is not claimed as a full local Docker frontend compile.
- Local API/web containers recreated successfully against the existing installation, preserving records, environment and volumes.
- MCP: unauthenticated request on configured localhost returns 401; untrusted Host returns 403. No actual external MCP client was connected.
- Full Docker build, fresh-account browser signup/Home, core CRUD, PDF/private-file access, restart and backup/restore checks are configured in required GitHub CI. This report predates that candidate run; use PR checks for its outcome.

## Notes

- Independent frontend/backend review caught and fixed the remaining Cloud-only MCP hostname and unavailable linked-account controls.
- All 84 tracked migration SQL/metadata files are byte-identical to the base. Retired Cloud schemas remain migration-only; historical user columns remain for upgrades. No user data was dropped or reset.
- Removed Cloud billing, plan caps, profile/referral rewards, CMS, landing and operator APIs. Resource usage remains observable; operational size/rate/auth safeguards remain.
- README stays short and now starts users at Home. All community features have no subscription requirement; third-party providers and hosting can still cost money.
- Paid AI, social OAuth, live email delivery and other third-party integrations were not exercised without credentials. Fresh empty Home was verified in mounted tests and added to CI; the local computer-use account already had synthetic records.
- No merge or repository-protection change performed. Owner retains merge decision.
