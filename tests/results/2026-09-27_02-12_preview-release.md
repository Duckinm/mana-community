# QA Report — v0.1.0-preview.1 publication — 2026-09-27T02:12:09+07:00

## TypeScript

- apps/web: PASS — exact-commit hosted CI.
- apps/api: PASS — exact-commit hosted CI.
- Shared database and UI package typechecks also passed.

## Provider Tree

- No source changes for publication. Source tree matches the reviewed PR candidate; prior source and browser evidence is retained in the tagged QA reports.

## Visual

- Light theme: PASS — hosted Chromium task/theme assertions and screenshot capture.
- Dark theme: PASS — hosted Chromium task/theme assertions and screenshot capture.
- This publication pass does not claim a new manual visual or accessibility audit.

## API / E2E

- PASS: code tests and web build, fresh Docker installation, browser signup/verification/login, core records, private file isolation and real PDF generation.
- PASS: migration ownership, container recreation, persisted records/private files, backup restoration into fresh volumes and rehearsal cleanup.
- PASS: Required CI on 188f64400fba086338e683a04524bb765a615175.
- Evidence: https://github.com/Duckinm/mana-community/actions/runs/36264810058
- PASS: final source secret scan found no leaks; landing and headquarters/control-panel app paths are absent.
- Independent review confirmed release scope, source-only distribution, third-party notices, same-version recovery instructions and preserved limitations.

## Notes

- Immutable release target: 188f64400fba086338e683a04524bb765a615175; intended tag: v0.1.0-preview.1.
- Hosted acceptance: Linux x64. Prior local acceptance: Apple Silicon with Docker.
- Local preview only; no public-server, Windows, paid-provider or cross-version recovery certification. Test TODOs/background warnings and the earlier non-reproducing download timeout remain disclosed in the release notes.
- Source-only prerelease plus this QA report; no application binary or prebuilt container image is distributed.
