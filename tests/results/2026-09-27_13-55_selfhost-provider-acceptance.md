# QA Report — Self-hosted provider availability — 2026-09-27T13:55:00+07:00

## TypeScript

- apps/web: PASS — pinned Bun 1.3.10 `bun x tsc --noEmit --project apps/web/tsconfig.json`.
- apps/api: PASS — pinned Bun 1.3.10 `bun x tsc --noEmit --project apps/api/tsconfig.json`.
- Final checks ran sequentially against the combined working tree on `codex/selfhost-availability`, based on `188f64400fba086338e683a04524bb765a615175`. No implementation changes followed these checks.
- PASS — `git diff --check`.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- PASS — existing application providers retained. QueryClientProvider and SessionProvider remain above the app in the root route; the capability query also works before authentication. The chat session retains FinanceProvider.

## Visual

- Light theme: PASS for the exercised Thai chat, AI settings, notifications, finance and document surfaces. Missing-service notices remain visible and manual controls remain available.
- Dark theme: PASS for English chat and integrations. The final notice uses the existing raised-surface/border tokens and readable text, including the narrow browser layout.
- Original English/dark browser preferences restored after testing. The browser remains logged in.
- These are representative visual checks, not an exhaustive screenshot comparison of every route, viewport or dialog.

## API / E2E

### Regression and automated checks

- Reproduced the reported failure through Computer Use before changing the running installation: submitting a greeting created a conversation with only the user message, no response and no persistent error. The missing AI provider failed on the server; the subsequent history refresh erased the error. This was not evidence of a database deadlock.
- PASS — focused web suite: 18 tests in 5 files using the normal `bun run test` package command. Files: `capability-notice.test.tsx`, `command-input.test.tsx`, `finance/import-receipts.test.ts`, `lib/chat-stream.test.ts`, and `ai/use-chat-stream.test.tsx` in their respective source directories.
- PASS — focused API suite: 12 tests, 55 assertions across `provider-capabilities`, `ai-client-configuration`, `optional-providers`, `receipt-draft` and `chat-terminal-events`.
- Checks cover structured missing-configuration responses before writes, retained authorization, partial credential groups, persistent HTTP/SSE errors, truncated streams, cancellation/timeouts, split UTF-8, draft retention after failed submission, and terminal events only after persistence. See the independent/API reports for commands, red/green evidence and harness retries.
- PASS — full native web production build, including client, SSR and prerender, with Bun 1.3.10 and `VITE_API_URL=same-origin`; optional frontend telemetry keys empty. Existing large-chunk warnings remain.
- PASS — API Docker build and healthy API/web services after replacement in the existing local test stack.
- PASS — live `/api/capabilities` reports AI, voice transcription, social providers, Google Calendar, LINE, push and bank slip verification unavailable, and email `local`, without secrets or infrastructure URLs.

### Computer Use acceptance

Tests used synthetic QA records through the app at `http://localhost:3350`. Records and existing user data were preserved across the update.

| Area | Observed result |
| --- | --- |
| Chat | Original greeting is retained. A persistent EN/TH missing-AI notice explains manual alternatives; input, send and attachments are disabled. No silent waiting state. |
| Contacts | Created `QA Local Contact`; detail and activity persisted. Deterministic briefing is now labelled relationship summary. |
| Projects/tasks | Created `QA Local Project` and a task, then changed the task to Done; persisted board/detail state verified. |
| Documents | Created and published synthetic THB 100 invoice `INV2609001` without sending email. Validation caught a missing required phone field. Published/unpaid view persisted. |
| PDF | Downloaded invoice PDF; actual local file has a PDF header and nonzero size (190,425 bytes). Browser download-event waiting timed out, but the native download succeeded. |
| Manual finance | Created `QA local income`, THB 100 received; transaction table retained it after restart. AI receipt import is disabled with a manual-entry explanation. |
| Native calendar | Created an all-day synthetic event with no attendees or reminder; visible after save without Google Calendar. |
| Local storage | Uploaded a 53-byte synthetic text file to the contact folder. Unsupported preview is clearly labelled; download retrieved the exact text from local storage. |
| Integrations | Google Calendar connect is disabled with configuration guidance. LINE explains missing configuration. No provider permissions requested. |
| AI/voice settings | Thai missing-AI and voice notices rendered; voice unavailable without requesting microphone access. |
| Notifications | Browser push and LINE choices disabled with explanations; in-app controls remain available. Mailpit warning states that email stays local. |
| Invoice payment | Upload remains available for manual review; notices explicitly distinguish absent automatic extraction and absent bank verification. No fake verification stages. |
| Invoice email | Send confirmation shows the local-Mailpit-only warning before sending. Cancelled; no customer email sent. |

### Verification boundaries

- No paid AI response, valid third-party connection, external email delivery, real bank verification or push delivery was exercised. Configuration flags indicate presence, not credential validity or service health. Provider failures are covered by mocked failure/stream tests, not a live invalid-key rehearsal.
- Signed-out social-login controls were inspected in source; final browser login testing was not repeated because the supplied session was kept signed in. A separate login tab correctly redirected the existing session to chat.
- Budget editing, recurring schedules, public-client payment submission, destructive actions and account/credential changes were not included in this pass. Do not interpret the smoke matrix as exhaustive product certification.
- Full fresh Docker frontend build was cancelled after client compilation stalled under local Docker VM pressure. The complete native build was packed into the existing locked web runtime image, then served and checked through the real local stack. Dependency lockfiles and container definitions did not change. This does not certify a clean Docker build on another host; hosted CI remains required before owner merge.

## Notes

- Local installation source and API/web runtime were updated; generated environment files, credentials and persistent volumes were not replaced or deleted. Other local stacks were left running.
- QA records remain clearly named in the test installation. No existing business records were removed.
- Separate implementation and critique were performed with AI agents. See [API report](2026-09-27_13-07_optional-provider-api.md), [UI audit](2026-09-27_13-02_optional-provider-ui-audit.md), and [independent review](2026-09-27_13-09_optional-provider-independent-review.md).
- Stream failures preserve visible messages and release the busy state; retry guidance asks users to review any completed actions first. Client waits are bounded to 60 seconds without stream bytes and 120 seconds overall, including heartbeat-only responses.
- The owner retains the merge decision. No merge or repository-protection change was performed.
