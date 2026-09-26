# Security policy

## Report privately

Send suspected vulnerabilities to [duckii.mt@gmail.com](mailto:duckii.mt@gmail.com), the private reporting contact confirmed by the MANA owner, [Duckinm](https://github.com/Duckinm). Do not put exploit details, credentials, or customer data in public issues or PRs. GitHub [private vulnerability reporting](https://github.com/Duckinm/mana-community/security/advisories/new) is also enabled.

Include the affected revision or version, installation mode, impact, and a minimal reproduction using synthetic data. Redact secrets and personal information. Do not test against other people's accounts or MANA Cloud without explicit authorization. A report does not require accessing or retaining anyone else's data.

The project owner coordinates investigation, a fix, and disclosure. There is no guaranteed response time, bounty program, or paid support commitment. If you do not receive a response, follow up through the same private address rather than posting exploit details publicly. Agree on disclosure timing with the maintainer where possible; credit is given with the reporter's permission.

## Supported scope

MANA is available as a local self-hosted preview. There are no supported stable release lines or security backport commitments yet. Reports against the current preview and default branch are welcome; fixes may require updating to a newer revision. Release notes must identify known security limitations and any migration needed to apply a fix.

The local preview binds its services to localhost and uses captured email for development. It is not an approved public-server deployment recipe. Keep generated environment files and backups private, and do not expose the preview's mail viewer or storage administration to the internet. See [self-hosting](docs/self-hosting.md) for the supported setup and boundaries.
