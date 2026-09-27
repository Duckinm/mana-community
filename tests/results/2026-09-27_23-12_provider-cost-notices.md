# QA Report — Provider cost notices — 2026-09-27T23:12:00+07:00

Working tree based on 777f0ef; Bun 1.3.10.

## TypeScript

- apps/web: PASS — bun run typecheck.
- apps/api: PASS — bun run typecheck; no API changes.

## Provider Tree

- PASS — unchanged. Reused the capability query and notice component; no new providers.

## Visual

- Light theme: PASS — Thai chat cost notice at 390 × 844, wrapping without overflow.
- Dark theme: PASS — English chat and AI settings; final cost text uses foreground contrast after the first visual pass found muted text too faint.
- Configured-provider visual checks used a temporary read-only localhost proxy that simulated only capability flags. All non-GET/HEAD requests were blocked, so no provider action, credential change or billable request was made.
- Real installation still has no AI credentials. Missing configuration keeps its existing explanation and manual fallback. Temporary viewport reset; preview preferences restored.
- Payment-slip/action placement reviewed in source; no real paid verification or transcription was exercised. These checks do not establish provider health or pricing.

## API / E2E

- Web suite: PASS — 102 tests across 41 files. Shared notice test covers configured, missing, loading, failed/stale configuration and English/Thai cost copy.
- Production web build: PASS. Updated local Docker web runtime uses the built artifact and existing production stage; existing data and environment preserved.
- No backend behavior or API contract changed. Full CI remains required for the pushed candidate.

## Notes

- Inline notices cover chat/voice, AI settings, receipt import, financial AI summaries, slip upload, verification and failed-slip retry. The connected provider account may incur charges; wording does not claim guest uploaders pay.
- Combined notices avoid duplicate copy for chat/voice and automatic slip reading/verification. No confirmation popup, pricing estimate or MANA checkout added.
- Independent reviewer found that failed-slip retry can also trigger bank verification; its notice now covers both providers when configured.
- Setup guide updated; short README intentionally unchanged.
- No merge or protection changes performed.
