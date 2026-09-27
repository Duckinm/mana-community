# QA Report — Community usage and pricing removal — 2026-09-27T22:39:00+07:00

Tested the shared working tree based on `9a01a49` on `codex/selfhost-availability`. This is the frontend implementation pass; integrated compilation and browser acceptance are recorded separately by the coordinating engineer.

## TypeScript

- apps/web: NOT RUN in this pass; coordinated sequential compilation after API contract changes.
- apps/api: NOT RUN in this pass; owned by backend implementation and integrated verification.

## Provider Tree

- Unchanged by this subtask. Usage remains inside the existing settings and React Query providers.
- The new static community panel does not introduce providers or requests.

## Visual

- Light theme: NOT RUN in this subtask; browser acceptance delegated to coordinating engineer.
- Dark theme: NOT RUN in this subtask; browser acceptance delegated to coordinating engineer.

## API / E2E

- PASS: `bun run --cwd apps/web test src/components/settings/community-usage.test.tsx src/components/ai/use-chat-stream.test.tsx src/lib/chat-stream.test.ts` using pinned Bun 1.3.10 — 3 files, 12 tests.
- New checks verify the settings destination is Usage, the rendered screen explains free core features and external provider costs without a checkout action, branding preferences work for a legacy free-plan user, and community links contain no invented referral offer or membership count.
- Existing chat stream and hook tests still pass after removing subscription-cap state; provider failure persistence, truncated streams, cancellation, and deadlines remain covered.
- PASS: `git diff --check` at the time of this pass.
- Source scan found no remaining pricing/upgrade/paid-plan UI. Customer billing, receipt/invoice amounts, customer referral sources, and browser push subscriptions are intentionally retained.

## Notes

- Deleted Cloud billing, checkout, subscription management, plan matrix, plan-change impact, pricing helpers and the AI upsell hook, rather than retaining hidden Cloud-mode branches.
- `/settings/usage` shows self-hosted information and existing activity/storage statistics; `/settings/billing` redirects old bookmarks to Usage.
- Removed plan restrictions from branding, calendar sync, project failure toasts, payment-slip verification, email publication, and AI chat controls. Configuration-based warnings and provider requirements remain.
- Replaced the unused community referral promotion and fake member counts with actual project and issue links.
- Removed unused Stripe dependencies from the web package; lockfile regeneration is coordinated with backend removal.
- No paid provider calls, destructive account actions, real customer emails, or merges were performed.

## Independent first-use critique

- Reviewed root home, auth callbacks, step navigation, loading/error UI, and reward-removal changes against first-use and returning-user requirements.
- PASS: email/social signup, login, verification resend, root entry, and authenticated auth-layout destinations consistently target `/home`.
- PASS: home does not require a profile, AI provider, or payment before opening core tools; completed document and transaction rows open lists rather than new-record forms.
- PASS: a pending checklist shows its skeleton; a failed checklist shows retry instead of fabricated progress on Home.
- Found an adjacent existing problem: the sidebar checklist ignored query failures and could display invented 0/4 progress. Reported to the coordinating engineer for the owned checklist file.
- Added independent mounted UI tests for partial progress, quotation editor destination, manual transaction form destination, completed transaction list navigation, and loading behavior.
- PASS: `bun run --cwd apps/web test src/components/onboarding/first-use-acceptance.test.tsx src/components/onboarding/workspace-home.test.tsx src/components/settings/community-usage.test.tsx` — 11 tests across 3 files. The independent test file was initially executed under `components/settings/first-use-acceptance.test.tsx` and then moved to its owning onboarding feature directory without content changes.
- Browser layout, real auth redirects, and actual persisted workflow acceptance remain the coordinating engineer's runtime checks, not claimed by these mocked UI tests.

## Independent backend and database critique

- Compared all 84 tracked files under `packages/db/drizzle` with `HEAD` using SHA-256; all unchanged. This includes applied SQL and migration metadata.
- Compared the six moved legacy table definitions with the originals: only import paths changed. Drizzle config explicitly includes legacy definitions, preserving migration knowledge without exporting Cloud tables to the running application.
- Confirmed the deleted ledger was the global MANA Cloud Stripe/provider revenue and cost ledger. Core user transactions, wallets, budgets, accounting, invoices, and document payment recording remain.
- Reviewed usage, projects, storage, calendar, document email, chat, payment-slip verification, external MCP, and profile changes. Subscription checks were removed; user-scoped query predicates, session ownership, MCP bearer-token authentication, document public tokens, request/image limits, and guest slip lifetime abuse protection remain.
- Cloud billing checkout/portal/plan-change endpoints, CMS/blog/landing endpoints, operations, and Cloud ledger routes are no longer mounted. Better Auth admin support remains for access control and feedback triage; this is not a claim that every privileged endpoint was removed.
- Reported obsolete `QUOTA_EXCEEDED` catch branches and 1 GB upsell-era messages to the backend implementation engineer; also identified unnecessary legacy plan SELECTs and newly unused image buffers for cleanup.
- Found a pre-existing self-hosted MCP issue outside the original deletion diff: production `allowedMcpHosts()` accepted only `mana-api.fly.dev`. Reported it to root for a configured-host fix preserving DNS-rebinding checks.
- Updated the frontend's EN/TH `get_usage` tool-status labels after the backend removed the plan-named MCP tool.
- This review is source analysis and migration-byte verification. No compiler, live database mutation, or provider request was run during this review.

## MCP configured-host regression

- Root approved the minimal adjacent fix after the independent review found the production-only Cloud host restriction.
- RED: `bun test apps/api/src/__tests__/mcp-self-hosted-hosts.test.ts` under pinned Bun 1.3.10 failed because production `localhost:3350` received 403, while the unrelated old Cloud host reached authentication (401).
- Changed `allowedMcpHosts()` to exact hosts from `BETTER_AUTH_URL` and `WEB_URL`, deduplicated. Development retains its explicit loopback hosts. No wildcard or arbitrary CORS origin was added to the host allowlist.
- GREEN: same test passed (1 test, 4 assertions) across both local-port and separate API/web domain configurations. Configured direct and proxied requests reach bearer authentication (401 without a token); hostile Host, hostile browser Origin, and unconfigured old Cloud host are rejected (403).
- DNS-rebinding protection remains enabled in the MCP SDK transport with the same host list; Origin validation and bearer validation are unchanged.
- Inspected `apps/web/serve.ts`: it copies request headers before proxying `/mcp` to the internal API. An ephemeral local Bun HTTP probe confirmed an explicitly supplied `Host: localhost:3350` is retained when fetching a different internal address. The web-origin host must therefore be in the API allowlist.
- This guard regression deliberately uses no token and no database connection; a successful authenticated MCP tool call is not claimed by this test.
- Restored the payment-slip review panel's `Link` import: it is still used for document detail navigation after removing the separate billing upsell link.

## Linked account availability follow-up

- Root's browser pass found Profile → Linked accounts still offered Connect with no social provider keys, despite the login/signup guards.
- RED: both new mounted tests in `linked-accounts-panel.test.tsx` failed against the original component: all provider Connect buttons remained enabled, including after a capability-check failure.
- Added the existing capabilities query and shared notice, plus per-provider Connect guards. Existing Disconnect actions are independent of provider configuration and remain usable.
- GREEN: `bun run --cwd apps/web test src/components/settings/linked-accounts-panel.test.tsx` — 2 tests passed. Selectively configured Discord connects; missing Google/Facebook cannot connect. A failed capability refresh disables stale connection options while a connected Google account can still be unlinked.
- Root was notified that production files were ready for the final web build and light/dark browser check. No unrelated frontend expansion was made.
