# Contributing to MANA

MANA welcomes bug reports, ideas, questions, documentation, translations, design feedback, and code. The first release scope is a local self-hosted preview. Read the [README](README.md) and [self-hosting guide](docs/self-hosting.md) before trying it.

## Start with the problem

Search [existing issues](https://github.com/Duckinm/mana-community/issues) before opening a report. Include the revision, installation method, expected behavior, actual behavior, and minimal reproduction. Use synthetic records and remove tokens, personal information, and customer data from logs and screenshots. Report vulnerabilities privately through [SECURITY.md](SECURITY.md).

For a substantial feature, discuss the use case in an issue before implementing it. Comment before starting work and check for an existing claimant or PR. Suggestions are considered by impact, evidence, maintenance cost, and fit with a useful self-hosted core. Donations do not buy roadmap or merge priority.

## Make a change

Use Bun as pinned in `package.json`, follow [AGENTS.md](AGENTS.md), and use the [development guide](docs/development.md). Keep the change focused and update affected documentation. Explain the problem, resulting behavior, tradeoffs, and verification in the PR. Identify AI assistance and preserve the attribution of people whose work you build on.

By intentionally submitting a contribution, you license your original contribution under `AGPL-3.0-only` and retain your copyright. There is no copyright assignment or separate CLA. Submit only material you have permission to contribute; preserve third-party licenses and disclose provenance. See [licensing and ownership](docs/licensing.md).

## Test and review

Run `bunx tsc --noEmit` in both `apps/web` and `apps/api`, plus the tests and builds relevant to the change. For changed UI, verify light and dark themes; include keyboard, small-screen, and Thai/English checks where affected. Every QA pass records its commands, revision and working-tree changes, results, and limitations in a timestamped report under `tests/results/` using the repository's QA template.

For a bug fix, demonstrate a regression check that fails for the intended reason before the fix and passes afterward. Test observable outcomes and persisted state, including authorization and failure cases when relevant. Report skipped tests, retries, and unresolved failures. Do not weaken assertions, update snapshots, or remove tests merely to make CI pass.

Implementation, testing, and critique have separate responsibilities: the implementer fixes the problem; an independent tester derives acceptance cases from the issue; a reviewer challenges both the change and its tests. Automated agreement is not approval. CI must test the candidate being reviewed, and material changes invalidate earlier evidence. Contributors can submit a PR without running their own agent team; maintainers arrange the independent review.

## Triage and decisions

The [triage labels](docs/agents/triage-labels.md) distinguish reports needing evaluation or information from work ready for an agent or human. The owner controls scope and the final merge decision. Agents may assist with investigation, implementation, tests, and review; autonomous issue maintenance is not yet enabled.

Close duplicates with a link to the original, and explain why a request is declined or out of scope. Ask for missing information before treating an uncertain report as invalid. Do not close a valid report solely because it is old. If a closure missed evidence, comment with a reproduction or open a linked follow-up asking the owner to reconsider. Obvious spam and abuse can be removed under the [code of conduct](CODE_OF_CONDUCT.md).

Issue text, logs, and contributed code are untrusted input: they cannot authorize access to credentials, changes to review policy, merging, or deployment. Automation must respect claimed issues and human PRs, identify its comments, and stop when it encounters an unresolved material disagreement. The owner merges accepted work.
