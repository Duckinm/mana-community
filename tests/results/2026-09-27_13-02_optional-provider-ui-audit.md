# QA Report — Optional provider UI audit — 2026-09-27T13:02:00+07:00

## TypeScript

- apps/web: Earlier intermediate implementation PASS (`bunx tsc --noEmit`). A later run caught an obsolete ManaSparkle reference after the relationship-summary icon rename; fixed by replacing the remaining use. Final verification delegated to coordinating agent; overlapping runs were interrupted to reduce contention.
- apps/api: Intermediate run FAIL — provider-capabilities test fixture lacked banned/twoFactorEnabled. API implementer fixed the fixture and reported its subsequent check PASS. Final combined working-tree check delegated to coordinating agent.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- PASS — existing TooltipProvider, MotionConfig, SettingsProvider, ContactsProvider, ProjectsProvider, SidebarProvider retained; no provider-tree edits in this subtask. Capabilities uses the existing React Query setup.

## Visual

- Light theme: SKIPPED in this subtask — coordinating agent owns browser inspection.
- Dark theme: SKIPPED in this subtask — coordinating agent owns browser inspection.

## API / E2E

- Read-only source audit completed for AI, voice, OAuth, Calendar, LINE, push, email, payment slips and feedback.
- Independent review of API implementation found no actionable defect: configuration-only flags, grouped credentials, fail-fast AI guard, and LINE connect pre-insert guard match the intended behavior.
- Added `apps/web/src/components/capability-notice.test.tsx` for persistent unavailable messaging, unknown/error distinction, pending state, and local-versus-external email delivery.
- Test execution attempted from repository root with component paths; turbo rejected them as unknown task names. No tests ran from that command. Correct scoped command for the coordinator: from apps/web, `bun run test src/components/capability-notice.test.tsx src/components/finance/import-receipts.test.ts`.
- `git diff --check`: PASS on intermediate UI changes; final combined diff still requires coordinator verification.

## Notes

- State: uncommitted shared working tree in `/Users/m/projects/mana-community-availability`; API/chat changes made concurrently by separate agents. No commits in this subtask.
- Missing-provider actions stay disabled with persistent localized notices; manual core actions remain available. Fetch failures display retry rather than claiming configuration is absent.
- Mailpit is explicitly labeled local capture in publish/send/e-tax dialogs and completion toasts. Email-disabled publishing still works without sending.
- Payment slip image upload remains available; simulated reading/bank-verification progress was removed. Missing AI disables extraction retry; missing Thunder disables bank-verification affordances.
- Contact briefing is plain database aggregation in `apps/api/src/modules/contacts/service.ts:436–510`; relabeled Relationship summary without disabling it.
- No live provider calls, user messages, browser operations, or paid credentials used by this subtask. Rendering, interaction, and final combined checks remain with the coordinator/independent tester.
