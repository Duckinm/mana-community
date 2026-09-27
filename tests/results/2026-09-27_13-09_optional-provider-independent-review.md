# QA Report — Optional provider independent review — 2026-09-27T13:09:00+07:00

## TypeScript

- apps/api: PASS — native Bun 1.3.10 `bun x tsc --noEmit` in `apps/api` on the intermediate shared working tree.
- apps/web: SKIPPED final independent rerun — an overlapping `bun x tsc --noEmit` was stopped with other duplicate compiler processes to reduce host contention. Coordinator reported its web compiler exited successfully and owns the final combined-tree rerun.
- Material edits continued during review; intermediate compiler results do not certify the final tree.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- PASS by source inspection — TooltipProvider, MotionConfig, SettingsProvider, ContactsProvider, ProjectsProvider and SidebarProvider retained.
- QueryClientProvider and SessionProvider remain in `apps/web/src/routes/__root.tsx`; FinanceProvider wraps the chat session route in `apps/web/src/routes/_app/chat/$sessionId.tsx`.
- The new capability query uses the existing query provider. No provider-tree changes were made by this reviewer.

## Visual

- Light theme: SKIPPED by this reviewer — coordinator owns live browser checks.
- Dark theme: SKIPPED by this reviewer — coordinator owns live browser checks.
- Static markup tests below verify notice wording and conditional states, not browser layout or accessibility interaction.

## API / E2E

- Tested base: `188f64400fba086338e683a04524bb765a615175` plus uncommitted changes in `/Users/m/projects/mana-community-availability`; no commits created.
- Native test runner: `/tmp/mana-community-qa-tools.QB1Npz/bun-darwin-aarch64/bun` version 1.3.10.
- PASS — from `apps/api`, `bun test src/__tests__/provider-capabilities.test.ts src/__tests__/ai-client-configuration.test.ts`: 7 tests, 45 assertions. Required environment values were synthetic, with database/storage endpoints on `127.0.0.1:1`; no real provider credentials were supplied.
- API assertions cover public configuration flags without provider/network/auth probes; partial credential groups; typed missing-AI errors before database work; missing-AI authentication; missing LINE account ID before writes; and configured chat SSE response shape.
- Earlier identical API run: 5 passed, 2 timed out under concurrent compiler load. No failed assertions were observed. After redundant compiler processes were stopped, the unchanged tests passed in 5.37 seconds.
- PASS — from `apps/web`, `bun run test src/components/capability-notice.test.tsx src/components/finance/import-receipts.test.ts src/lib/chat-stream.test.ts`: 13 tests across 3 files, in 560 ms.
- Stream tests cover interrupted EOF, terminal error with an open server stream, manual cancellation, silent-stream timeout, split UTF-8 chunks, and an absolute request deadline despite continuing heartbeats. The reviewer changed stream test imports to the package's Vitest convention and added the last case.
- Capability notice tests cover absent configuration, fetch failure with stale data, pending state, and local capture versus disabled/external email delivery.
- Harness caveat: forcing Vitest through `bun --bun run test` caused all 4 capability-notice tests to bypass their hook mock and fail with `No QueryClient set`. The normal package command above passes without changing those tests or source. Do not treat the forced-runtime run as product behavior.
- No Docker, browser, real provider call, paid request, or user-data mutation was performed by this reviewer. End-to-end core workflows and configured invalid-key behavior remain with the coordinator.

## Notes

- Reproduced a real no-stall gap in the initial parser: a 10 ms byte-idle timer stayed pending after 65 ms when heartbeat comments arrived every 4 ms. The API emits such comments every 20 seconds. The coordinator added a 120-second overall chat request deadline, which also bounds the wait for response headers; the new parser test verifies that aborting such a heartbeat stream cancels its reader and preserves the timeout reason.
- Identified terminal-event cleanup racing a subsequent send and an earlier completion fetch erasing the new optimistic messages. Current source adds controller identity guards to stream events/finalization and an `isCurrent` check after the history fetch. The callback predicate also rejects aborted controllers after session navigation. These React lifecycle race fixes were reviewed in source; the parser suite does not mount the hook or reproduce the full UI race.
- Current source moves terminal chat events after awaited persistence, avoiding the previous arbitrary 150 ms history-reload delay. The coordinator/API implementer owns its dedicated persistence-order regression check.
- The capability request now combines the query cancellation signal with a 10-second timeout and one retry, so an unresponsive capabilities endpoint can reach the retry notice. Reviewed in source; no real timer-driven browser test was performed here.
- Follow-up resolved at 13:12: `CommandInput` awaits its submission callback; `false` or a rejected promise preserves the draft, and ChatHome returns `false` when session creation fails. Added `apps/web/src/components/command-input.test.tsx` using existing Testing Library dependencies: 2 mounted-component tests PASS. They verify disabled input while pending, text/attachment preservation after rejection, the same payload on retry, clearing only after success, and recovery after a thrown network error.
- Mounting-test harness notes: the first run hit Vite's transformed React instance versus the renderer's native React dispatcher. The test file now shares the renderer's native React module with application imports. An intermediate attempt required adding its default export. No product or build configuration changed to make the test pass; assertions remain against the real CommandInput component.
- PASS follow-up combined command: from `apps/web`, `bun run test src/components/command-input.test.tsx src/components/capability-notice.test.tsx src/components/finance/import-receipts.test.ts src/lib/chat-stream.test.ts` — 15 tests in 4 files, 3.27 seconds. `git diff --check` also PASS at this snapshot.
- PASS mounted chat-hook follow-up at 13:26: added `apps/web/src/components/ai/use-chat-stream.test.tsx`. Its 3 tests verify HTTP 503/`AI_NOT_CONFIGURED` leaves a persistent localized error after message-history clearing, an SSE error preserves partial content without calling the history-reload callback, and premature EOF shows the interrupted error while releasing the streaming lock for another send. All requests use `vi.stubGlobal('fetch', ...)`; cleanup restores globals and unmounts the hook. No real network was used.
- The first mounted hook run passed 2 of 3 cases; its SSE assertion expected the server's raw wording. Current implementation intentionally uses the localized `streamFailed` message, so the expectation now checks that exact translation while retaining the error-persistence, callback, cancellation, and partial-content assertions. No product source changed.
- Final focused web command: `bun run test src/components/ai/use-chat-stream.test.tsx src/components/command-input.test.tsx src/components/capability-notice.test.tsx src/components/finance/import-receipts.test.ts src/lib/chat-stream.test.ts` — PASS, 18 tests across 5 files in 1.99 seconds. `git diff --check` PASS. Hook retry/late-finally race and real provider behavior remain outside these mounted failure tests.
- Independent review does not establish live provider health, final browser acceptance, or complete regression coverage. Subsequent implementation changes require the coordinator's final checks.
