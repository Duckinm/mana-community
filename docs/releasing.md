# Releasing a local preview

The owner chooses the final merge and release. Publish only after `Required CI` succeeds for the reviewed commit, including fresh installation and backup restoration. Record tested platforms and known limitations in a QA report under `tests/results/`.

Use immutable `v0.x.y-preview.N` tags. Release notes describe changes, the exact source commit, supported setup and recovery instructions. The first release distributes source; users build their own Docker images. Keep the source and scripts corresponding to every distributed artifact, and preserve third-party notices. Prebuilt images require their own platform and license review before publication.

Back up before upgrading. A failed update is recovered with the old source version and its matching backup, not merely an old API image against a newer database. See [backup and restore](self-hosting.md#backup-and-restore).

The latest published preview receives fixes; no stable-release backport or response-time promise is made. Prioritize reported vulnerabilities through [SECURITY](../SECURITY.md). Changes to tests, CI and permissions receive independent review. A future agent integration must use separate limited credentials and cannot merge or deploy.
