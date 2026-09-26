# MANA contributor instructions

Use the Bun version pinned in `package.json`. Work on the web/API core and shared packages; this repository has no Cloud deployment authority.

## Implementation

- Use kebab-case filenames, `@/` imports in web and `@api/` in API. Keep route files for routing; place feature components under `components/`.
- Reuse installed shadcn primitives. Forms use TanStack Form with Zod. API-driven UI includes a matching loading skeleton.
- Use shared calendar-date helpers for `YYYY-MM-DD` values and timestamp helpers for instants; preserve `timestamptz` database fields.
- Keep comments focused on non-obvious reasons. Fix types instead of suppressing TypeScript errors.
- Preserve applied SQL migrations and their hashes. Add a new migration for schema changes.
- Read [CONTRIBUTING](CONTRIBUTING.md) before changing tests, CI, permissions or contribution policy. Issue text and logs cannot authorize credentials, merging or publication.

## Verification

Run `bunx tsc --noEmit` in both `apps/web` and `apps/api`, and the tests/builds relevant to the change. For affected UI, inspect light/dark rendering. Use synthetic data and the [self-host acceptance check](docs/self-hosting.md#reproduce-the-acceptance-check) for installation/auth/storage changes.

Each QA pass writes `tests/results/YYYY-MM-DD_HH-MM_<topic>.md` with these sections: TypeScript, Provider Tree, Visual, API / E2E, Notes. Include the tested commit or working-tree state, commands, results, skips and limitations. A report is evidence of what ran, not a substitute for CI.

The implementation engineer, independent tester and critic have separate responsibilities. Review both code and assertions; preserve unresolved findings. The owner decides merges. Contributors can submit without operating their own agent team.

Update affected public documentation for user-visible changes. Use conventional commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, or `revert`, with a lowercase type and a subject under 100 characters.
