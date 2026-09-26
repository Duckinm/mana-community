# QA Report — public preview acceptance — 2026-09-26T10:13:00+07:00

## TypeScript

- apps/web: PASS — pinned Bun 1.3.10, zero errors.
- apps/api: PASS — pinned Bun 1.3.10, zero errors.
- See [independent code QA](2026-09-26_10-10_public-export-code-qa.md) for package checks, test counts, and preserved limitations.

## Provider Tree (apps/web/src/routes/_app/route.tsx)

- PASS — independent source inspection, plus authenticated board rendering in the fresh Docker installation.

## Visual

- Light theme: PASS — synthetic project task rendered; screenshot inspected.
- Dark theme: PASS — same persisted task rendered; screenshot inspected.
- Desktop Chromium only. This is not full accessibility, mobile, or translation acceptance.

## API / E2E

- PASS: README installation script with generated secrets, clean Docker builds using Bun 1.3.10, and fresh database/storage/mail volumes. Separate loopback ports avoided existing installations.
- PASS: browser signup, captured verification email, real verification, fresh login, and unverified-account rejection.
- PASS: contact, two active projects, task, invoice and transaction without paid accounts or provider credentials.
- PASS: private upload/download bytes, trash/restore, anonymous denial and cross-account denial.
- PASS: publishing generated a real 417,614-byte PDF containing the uploaded logo.
- PASS: recreation of every container while retaining volumes, followed by fresh browser login and persisted-record/file assertions.
- PASS: stopped-writer backup of database, storage and mail volumes plus secrets; restore refused the existing installation.
- PASS: restored the backup into a separate Compose project with fresh volumes; fresh login and both projects, contact, document, transaction, task, file bytes and PDF persisted.
- PASS: migration ownership regression check on fresh installation, upgrade and Cloud-role preservation using disposable databases.
- Commands: `sh scripts/self-host.sh`; `bun --no-env-file tests/self-host/smoke.ts`; `bun --no-env-file tests/self-host/smoke.ts --verify-persistence`; `sh scripts/self-host-backup.sh backup <private-directory>`; `sh scripts/self-host-backup.sh restore <private-directory>`; `bun --no-env-file tests/self-host/migration-ownership.ts`.

## Notes

- Candidate: fresh public export working tree before its initial commit. Pinned lockfile SHA-256: `a7ac6158a3b1ea9844d38c1a36d1f55dbe0776d89af3faaf9f33fa6d76f7dfba`.
- macOS Apple Silicon with Linux Docker containers; browser harness used host Bun 1.4.0. Independent code tests and container builds used pinned Bun 1.3.10. GitHub-hosted Linux results must be checked on the published commit.
- Independent workflow review: pinned read-only workflows, no Cloud deployments, exact candidate checkout, failure-propagating Required CI, and backup cleanup. Four workflow/notice fixture tests passed with 63 assertions; actionlint passed.
- Final staged-source Gitleaks scan: zero findings, with redaction and inline allow-comments disabled. Private history, local environment files and generated account state are excluded from Git.
- API and web images collect available upstream license texts, copied-source notices and Debian copyrights. This inventory is not a blanket compatibility determination or approval to distribute prebuilt images.
- Scope remains a local self-hosted preview. Paid integrations, public-server hosting, cross-version migration recovery and autonomous issue maintenance are not certified by this pass. No PR was merged by an agent.
