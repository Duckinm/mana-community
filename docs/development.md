# Developing MANA

The repository contains the React web app, Bun/Elysia API, and shared database/UI packages. Landing pages, the Cloud control panel, and Cloud deployment configuration are maintained separately.

## Getting started

For a complete local installation with no provider accounts, use [Docker self-hosting](self-hosting.md). It builds production images and provisions storage, email capture, and PostgreSQL. The [acceptance check](self-hosting.md#reproduce-the-acceptance-check) exercises that installation.

For host development, install Bun as pinned in `package.json` and Docker with Compose:

```sh
bun install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
```

Configure the copied file before starting. Generate a unique authentication secret, provision S3-compatible storage with separate private/public buckets and CORS for `http://localhost:3000`, and configure a local Mailpit inbox or an outbound email sender. The example's storage credentials are placeholders. These host-development instructions assume those services already exist; the Docker recipe provisions them automatically.

```sh
bun run db
bun run db:migrate
bun dev
```

`bun dev` waits for the development PostgreSQL container, then starts web on port 3000 and API on port 4000. It does not provision mail/storage or run migrations. The separate Docker self-hosted installation uses port 3300 by default and its own database/volumes.

## Commands

```sh
bun run build
bun run test
bun run --cwd apps/web typecheck
bun run --cwd apps/api typecheck
bun run test:e2e
```

API integration tests require a disposable PostgreSQL database and explicit dummy environment values. [CI](../.github/workflows/ci.yml) provides the complete isolated setup, including per-file Bun test processes so module mocks cannot leak between files. Run tests against disposable data, never a real account database. The browser acceptance check requires a running Docker preview and Playwright Chromium.

## Environment variables

The [API example](../apps/api/.env.example) and [startup schema](../apps/api/src/env.ts) define the required values. Use `DEPLOYMENT_MODE=self-hosted` for core features without Cloud subscription caps. Email/password signup still requires verification through a working mail transport.

AI, OAuth and external integrations are optional. [Self-hosting](self-hosting.md#optional-integrations) explains the private integration configuration file. Provider credentials may incur costs. Container PDF rendering uses an internal web origin and browser-facing signed storage URLs; preserve that separation when changing networking.

## Source layout

- `apps/web/src/routes`: route declarations; feature UI lives under `components`.
- `apps/api/src/modules`: business services and API handlers.
- `packages/db`: schema, immutable migrations, and shared domain helpers.
- `packages/ui`: shared font and theme foundations.
- `tests/self-host`: synthetic signup, storage, document and recovery acceptance.

Follow [AGENTS](../AGENTS.md) and [CONTRIBUTING](../CONTRIBUTING.md). The required CI check must pass for the final candidate; the owner retains the merge decision.
