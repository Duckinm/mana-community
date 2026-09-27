# QA Report — Optional provider API — 2026-09-27T06:07:07Z

## TypeScript

- apps/api: PASS — `bun x tsc --noEmit`, exit 0 after the final chat settlement change and tests.
- apps/web: pending final combined verification by the frontend/root engineer; this API pass does not claim browser or frontend coverage.
- Runtime: pinned Bun 1.3.10 at `/tmp/mana-community-qa-tools.QB1Npz/bun-darwin-aarch64/bun`.
- Working tree based on `188f64400fba086338e683a04524bb765a615175`; API changes uncommitted, frontend work concurrent.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- PASS — unchanged API work introduces no provider requirement. Source inspection confirms TooltipProvider, MotionConfig, SettingsProvider, ContactsProvider, ProjectsProvider, and SidebarProvider remain mounted; session context is consumed from the existing parent.

## Visual

- Light theme: not run by this API agent; frontend engineer owns browser verification.
- Dark theme: not run by this API agent; frontend engineer owns browser verification.

## API / E2E

- PASS — 12 tests, 55 Bun assertions, zero failures across `provider-capabilities.test.ts`, `ai-client-configuration.test.ts`, `optional-providers.test.ts`, `receipt-draft.test.ts`, and `chat-terminal-events.test.ts`.
- Command from `apps/api`: `bun test src/__tests__/provider-capabilities.test.ts src/__tests__/ai-client-configuration.test.ts src/__tests__/optional-providers.test.ts src/__tests__/receipt-draft.test.ts src/__tests__/chat-terminal-events.test.ts`.
- Tests used synthetic environment variables with deliberately unreachable database/storage addresses. No real database or paid provider was used.
- Regression RED: chat without an AI key attempted database access and threw `Unexpected database access` rather than failing configuration first. GREEN: same test now rejects with the configured unavailable error before database selection/insertion or provider calls.
- Public `/api/capabilities` returns only the expected flags; tests cover all absent, all present, and partial Google/LINE/push credentials, Mailpit precedence over Resend, no auth lookup, no network probes, and `Cache-Control: no-store`.
- Chat, all five AI routes, and receipt import return structured HTTP 503 with code `AI_NOT_CONFIGURED` when unconfigured. AI authorization remains HTTP 401 without a session. Receipt service and LINE connect reject before database writes.
- Configured chat route preserves SSE HTTP 200, content type, and body bytes using a synthetic stream.
- Regression RED: chat emitted terminal `done` before the deferred settlement promise completed. GREEN: successful output, provider failure, and persistence failure all wait for settlement before `done`/`error`. Persistence failures report `error`; terminal errors contain no synthetic provider/database secret. This check runs isolated module mocks in a subprocess to avoid contaminating other tests.
- PASS — `git diff --check`.

## Notes

- Flags describe configuration presence only, never credential validity, provider reachability, account billing, or live delivery.
- `/api/capabilities` intentionally exposes no provider keys, client IDs, endpoints, or infrastructure URLs.
- LINE connection setup requires token, secret, and official account ID; the existing outbound LINE predicate is unchanged.
- Independent API review before the terminal settlement fix reported no actionable defects; the final settlement change was sent for follow-up review.
- Real self-host/browser acceptance, both frontend themes, configured-provider network failures, and live paid-provider success are outside this API test pass. No Docker build, commit, push, or browser action was performed by this agent.
