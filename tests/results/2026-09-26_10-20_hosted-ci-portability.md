# QA Report — hosted CI portability — 2026-09-26T10:22:46+07:00

## TypeScript

- apps/web: PASS — `bunx tsc --noEmit` under Bun 1.3.10.
- apps/api: PASS — `bunx tsc --noEmit` under Bun 1.3.10.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- Unchanged from [initial code QA](2026-09-26_10-10_public-export-code-qa.md). Authenticated task board rendered during the fixed smoke run.

## Visual

- Light theme: PASS — task rendered and screenshot captured by the full smoke.
- Dark theme: PASS — same persisted task rendered and screenshot captured.
- No application component changed. Initial screenshots were visually inspected; this follow-up checks theme and task assertions, not a new comprehensive visual audit.

## API / E2E

- Initial hosted run [36214169946](https://github.com/Duckinm/mana-community/actions/runs/36214169946) failed the notice fixture timeout and Playwright verification-cookie handling. These failures are preserved rather than presented as a passing launch check.
- Notice fixture: Linux Bun 1.3.10 with a slow fake `dpkg-query` reproduced the same 5,006ms timeout. The fixture inherited PATH and scanned host Debian packages even though its assertions concern synthetic package/source notices.
- Fixed fixture clears PATH only in its absolute-Bun child. Same hostile-PATH harness passed afterward; full Linux fixture command passed four tests with 65 assertions. Every original assertion and the five-second timeout remain; two assertions verify that OS discovery is absent from this fixture.
- Real image inventory remains enabled and independently checked: API 285 OS packages/notices; web 78 OS packages/notices. Production generator and Dockerfiles are unchanged.
- Original full smoke reproduced the cookie failure on native Bun 1.3.10. Minimal local-server reproduction: plain 200 passed; both 200 and 302 with Set-Cookie failed with a relative-URL parsing error in Playwright. Bun 1.4.0 passed all three, isolating the runtime/client interaction from MANA's verification token or redirect logic.
- Fixed smoke uses Chromium for both users' real verification links and sign-in forms. It retains origin, successful response, fresh session identity, unverified-account, anonymous access and cross-account denial assertions.
- PASS under pinned native Bun 1.3.10: full signup/verification/login, two projects and core records, private bytes/trash/restore/isolation, real 417,429-byte PDF with uploaded logo, light/dark task rendering and private state-file permissions.
- PASS: subsequent fresh-session reread of saved records and files. No additional container restart is claimed by that reread; the [initial acceptance](2026-09-26_10-13_public-preview-acceptance.md) separately tested restart and fresh-volume restoration.

## Notes

- Candidate: `codex/fix-linux-notice-check`, based on `bfd7b991556cbf6f8cc0b4a751e4bfa6e790d166`, with only the two test harnesses and this report changed.
- Independent reviewers checked notice isolation and authentication assertions. No application code, pinned runtime, timeout, access-control assertion or merge protection was weakened.
- Hosted Linux CI must rerun on the PR candidate. This report records local evidence, not a claimed hosted pass. The owner makes the merge decision.
- Known broader test TODOs and background warnings remain documented in the initial code QA report.
