# QA Report — Lean README and launch audit — 2026-09-27T20:20:00+07:00

## TypeScript

- apps/web: PASS — pinned Bun 1.3.10 `bun x tsc --noEmit --project apps/web/tsconfig.json`.
- apps/api: PASS — pinned Bun 1.3.10 `bun x tsc --noEmit --project apps/api/tsconfig.json`.
- Documentation-only work based on `188f64400fba086338e683a04524bb765a615175`; no application behavior changed in this pass.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- N/A — no provider or application changes.

## Visual

- Light theme: N/A — no application UI changes.
- Dark theme: N/A — no application UI changes.
- README structure reviewed independently for a newcomer. Existing logo and screenshot retained; local link/image targets checked. No new screenshot or product demo was fabricated.

## API / E2E

- PASS — `bun install --frozen-lockfile` using Bun 1.3.10; no lockfile change.
- PASS — all relative README links and image paths resolve in this checkout; the integrations heading exists in the setup guide.
- PASS — install instructions checked against `scripts/self-host.sh`: Git + running Docker, generated environment, default ports 3300/38025, local email verification, and readiness message match the script/configuration.
- README reduced from 908 to 268 whitespace-delimited words (about 70 percent).
- No new installation/E2E run for this documentation-only change. Existing main CI [36264810058](https://github.com/Duckinm/mana-community/actions/runs/36264810058) succeeded on `188f644`; PR #2 CI [36304013931](https://github.com/Duckinm/mana-community/actions/runs/36304013931) succeeded on `87042ec`. Those runs establish their own candidate results, not later source changes.
- Independent newcomer reviewer found no blocking omissions. Prerequisites, signup/local inbox, optional providers, local-only scope, first task, backups and troubleshooting remain reachable.

## Notes

### Verified public state

- Public `Duckinm/mana-community`, AGPL-3.0-only recognized, description and seven topics configured; homepage unset.
- One published source-only prerelease (`v0.1.0-preview.1`), no prebuilt app/container assets. PR #2 remains open at audit time.
- Issues enabled with bug and idea/question templates; no open issues. Discussions disabled; existing issue template already provides a feedback path.
- License, security contact, contribution instructions, code of conduct, roadmap and screenshot already exist. No additional governance document is needed for adoption.
- Corrected two stale self-hosting statements: Linux hosted acceptance already passed, and a tagged release already exists.

### Prioritized adoption work

1. Owner review/merge of the optional-provider fix, then publish a new tested preview so new visitors receive it. Do not advertise the local patched runtime as the published release.
2. Give provider-free newcomers a useful first screen. Both root navigation and login currently lead to `/chat`; reuse the existing Get Started flow/contact-to-invoice path instead of leaving disabled AI as the first impression.
3. Correct unconditional self-hosted onboarding credit promises (`get-started-checklist.tsx`, `profile-reward-finish.tsx`, and onboarding locales). The current +5 AI/monthly allowance wording conflicts with the no-provider preview.
4. Invite 3–5 technical freelancers to complete a first invoice independently. Record signup/install completion, build time/resource use, first useful outcome, and where help was needed. Include Apple Silicon, Linux and Windows/WSL; do not claim Windows support before testing.
5. Add a short real workflow recording and a few bounded contributor issues after observing those trials. Distribute the preview to relevant freelancer/self-hosting communities after the first-use blockers are fixed; no outreach messages were sent in this task.
6. Consider versioned prebuilt images if measured build friction justifies them; preserve licensing/inventory and platform verification. No unmeasured install-time or resource claim was added.

### Scope

Removed comparison tables, detailed Cloud plans, appearance-scale notes, repeated maintenance policy and an unconfigured donation placeholder from the README. Existing detailed documents remain available. No repository settings, release, issue, user data or merge protections changed during the audit. Final merges remain with the owner.
