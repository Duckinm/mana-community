# Database package

`src/schema/` contains the application tables. `src/seed.ts` is an **optional synthetic demo** for an existing account; installation does not run it. Its contacts use example domains. It does not create accounts, passwords, or provider credentials.

`src/legacy-schema/` retains retired Cloud tables (CMS, subscriptions, Stripe event records, operator ledger and profitability). They are excluded from application exports, but included by Drizzle configuration so future schema generation cannot silently propose dropping existing data. Legacy subscription/reward columns on `users` and `plan_archived_at` on projects are retained for the same reason; community access does not depend on them.

`drizzle/` is applied migration history, not a set of current features. Do not rewrite its SQL or snapshots: deployments identify migrations by their hashes. The historical owner-promotion migration contains an old account identifier; `migrate.ts` deliberately records its hash without executing that operation. No default owner account is created.

Use `bun run db:migrate` for installation and upgrades. This cleanup does not drop tables, delete records, or reset existing accounts.
