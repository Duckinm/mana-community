# Run MANA on your own computer

This local preview runs the core app without paid accounts. Docker supplies the web app, API, PostgreSQL database, file storage, and a local email inbox. Core features have no MANA Cloud subscription limits. Available disk space and machine resources still limit your installation.

The marketing site (`apps/landing`) and MANA Cloud control panel (`apps/control-panel`) are excluded from this installation. They are maintained separately from this repository. Default development, build, and test commands target the core apps and their shared packages; see [development](development.md#commands).

The supplied setup listens only on your computer. It does not deliver email to real recipients. The first release targets this local preview; public-server hosting and autonomous issue maintenance are later milestones. See [the roadmap](../ROADMAP.md).

## First start

Install Git and [Docker Desktop with Compose](https://docs.docker.com/desktop/) and start Docker. Compose 2.24 or newer is required. On Linux, Docker Engine with the Compose plugin also supplies the required commands. The current local rehearsal covers Apple Silicon; Linux x64 is included in CI but needs a successful hosted run before claiming platform verification. Bun is included in the containers.

From a terminal:

```sh
git clone https://github.com/Duckinm/mana-community.git
cd mana-community
sh scripts/self-host.sh
```

The first start downloads images and builds the app; keep the terminal open until it reports that MANA is ready. The script generates local secrets, waits for the services, and applies database migrations. It never copies the developer's credentials or seeds an owner account.

1. Open [MANA](http://localhost:3300/register) and sign up with an email and password.
2. Open the [local inbox](http://localhost:38025), find the verification message, and follow its link. Any valid email format works here; the message stays in the local inbox.
3. Use Contacts to add a client. Create a project, add a task, prepare an invoice, and record a transaction. A second project does not require a subscription.
4. Upload a file in Storage, then download it. Publish a document and wait for its downloadable PDF.

Use email/password for this preview. Social sign-in, AI, bank verification, and external integrations need their own configuration. The local inbox is visible to anyone with access to this computer; it contains account-verification and password-reset links.

## Stop, restart, and inspect

Run these commands from the same checkout:

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml ps
docker compose --env-file .env.selfhost -f compose.selfhost.yml logs --tail=100 api web
docker compose --env-file .env.selfhost -f compose.selfhost.yml down
sh scripts/self-host.sh
```

`down` preserves the database, uploaded files, and inbox in named Docker volumes. **Do not add `--volumes` / `-v`** unless you intend to erase this installation's data. Keep `.env.selfhost` with your backups: it contains the database, storage, and authentication secrets. Do not publish it. Restart persistence is not a substitute for a tested backup and restore.

The Compose project is `mana-selfhost`, separate from the development database. One checkout is the default installation. For a second instance, run `export COMPOSE_PROJECT_NAME=mana-selfhost-second` and set different ports before starting it. Keep that same project name for every stop/restart command, including in later terminal sessions.

## If something stops

| Symptom | Next step |
| --- | --- |
| `docker` not found or cannot connect | Install Docker, open it, and wait until `docker info` succeeds. |
| Port already allocated | Run `sh scripts/self-host.sh --init-only`, edit the three `MANA_*_PORT` values in `.env.selfhost`, and run the script again. Use the configured web and inbox ports. |
| Build or download fails | Read the last error; check network access and Docker's disk/memory allowance, then rerun the script. Existing secrets and data remain. |
| Signup succeeded but no email arrives in your real inbox | Open the local inbox. This setup captures email instead of delivering it. |
| Social sign-in or AI unavailable | Use email/password and the normal app controls. These integrations are optional and are not configured by the local script. |
| A PDF stays unavailable | Inspect the API logs. The API image includes Chromium and Thai fonts; web rendering and storage must both be healthy. |

The API and database have no published host ports. The web app forwards API requests internally. Signed private-file downloads use the loopback storage endpoint; public images live in a separate bucket. Keeping internal and browser-facing origins separate is necessary for working downloads and PDF rendering.

## Reproduce the acceptance check

Contributors with Bun installed can run this against the local preview. It creates synthetic accounts and records and does not use an existing account:

```sh
bun install --frozen-lockfile
bunx playwright install chromium
bun --no-env-file tests/self-host/smoke.ts
docker compose --env-file .env.selfhost -f compose.selfhost.yml down
sh scripts/self-host.sh
bun --no-env-file tests/self-host/smoke.ts --verify-persistence
```

For non-default ports, set `SELF_HOST_URL` and `SELF_HOST_MAIL_URL`. The smoke check saves a temporary test-account password in a file with owner-only permissions so the restart check can log in again. It prints that file's path; delete it after the rehearsal. This check covers local installation behavior, not all product features or production recovery.

Storage permissions can also be checked independently:

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml run --rm --no-deps storage-init bun /app/apps/api/self-host/check-storage.ts
```

The public candidate is verified by [CI](../.github/workflows/ci.yml). Results and limitations are recorded in `tests/results/`; GitHub-hosted acceptance tests the exact candidate revision.

## Network use

No paid account is needed for the core preview. This is not an offline distribution: the first build downloads dependencies and images, currency conversion can use public exchange-rate services, and existing terms/help links point to MANA's website. Telemetry has no keys in the supplied Compose configuration.

## Optional integrations

The core installation needs none. To add your own AI or OAuth credentials later:

```sh
cp self-host/integrations.env.example .env.selfhost.integrations
chmod 600 .env.selfhost.integrations
```

Edit the new file and uncomment only settings with real values. For AI, set the provider's Anthropic-compatible endpoint, API key, and model ID together. Provider usage may cost money; no AI credit comes with the local installation. OAuth providers must allow your installation's callback URL shown in the example; update its port if yours differs. These optional integrations require separate provider testing and are outside the provider-free acceptance check.

Run `sh scripts/self-host.sh` again to recreate the API with these settings. Keep this file private and back it up. Core origins, storage, database, and Mailpit settings are controlled by Compose and cannot be replaced through this integrations file. Local emails continue to go to the captured inbox.

## Backup and restore

Run from the checkout, with the same `COMPOSE_PROJECT_NAME` used for installation:

```sh
sh scripts/self-host-backup.sh backup "$HOME/mana-backup-$(date +%Y%m%d-%H%M%S)"
```

The backup briefly stops the installation, copies all three volumes at the same point, records checksums and the database image, and restarts it. The directory includes account data, inbox messages, and secrets. Keep an encrypted copy on a different device; the script itself does not encrypt it. Only a directory with a `complete` marker is a completed backup.

Restore into a separate checkout of the **same source version**, on the same CPU architecture and exact database image. Keep that version's source with your backup until a tagged release is available. Do not initialize the destination with `self-host.sh` first. Choose an unused Compose project name; stop the source installation before starting the restored copy, because the restored configuration uses the same ports.

```sh
export COMPOSE_PROJECT_NAME=mana-selfhost-restored
sh scripts/self-host-backup.sh restore /absolute/path/to/mana-backup
sh scripts/self-host.sh
```

The script refuses existing project containers/volumes or an existing `.env.selfhost`. It checks archive integrity before copying data. If a restore fails after creating destination volumes, keep the backup and retry in another clean destination; do not overwrite a working installation. Sign in and check projects, documents, and uploaded-file downloads before relying on the restored copy. This is a local same-version recovery procedure, not cross-platform migration.

## Updates and rollback

Back up first and retain the current source version. Read the new version's release notes, switch the checkout to that reviewed version, and run `sh scripts/self-host.sh`; migrations run before the API starts. Test login, core records, file downloads, and a PDF afterward.

If an update fails, keep the failed installation stopped for diagnosis and restore the pre-update backup into a clean checkout of the old version. Do not simply run the old API against a database that has migrated forward. The initial preview has no previous supported release, so a cross-version upgrade is not yet claimed as tested.

## Before hosting for other people

Provide HTTPS and real public origins, configure a sender that delivers email, restrict the local inbox, establish backups and prove restoration, and define update and recovery procedures. Review the [license and source-distribution requirements](licensing.md). Do not expose this localhost recipe by changing its bind addresses and assume those tasks are complete.

The application supports configurable S3-compatible storage and optional AI/Resend credentials; see [environment configuration](development.md#environment-variables). A supported public-server recipe, real outbound-email rehearsal, and administrative bootstrap are outside this local preview's scope.
