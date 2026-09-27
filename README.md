<img alt="MANA" src="apps/web/public/logo/mana-logo-landscape.png" width="360">

A workspace for independent work: keep contacts, projects, documents, and finances connected, with an AI assistant that can help you act on them. Built with English and Thai interfaces and Thai freelancer workflows in mind.

[Get started](#get-started) · [How it works](#how-it-works) · [MANA Cloud](#mana-cloud) · [Community](#community-and-maintenance) · [Support](#support-mana) · [License](#license-and-copyright)

**Release status:** local self-hosted preview. The provider-free Docker setup is available below; see the [roadmap](ROADMAP.md) for the supported scope and upcoming work. Public-server hosting and autonomous issue maintenance are later milestones.

## Get started

- **Use the hosted app:** visit [MANA Cloud](https://app.heymana.app).
- **Explore the product:** see the [website](https://heymana.app) and [user documentation](https://heymana.app/docs/).
- **Run locally without paid accounts:** follow [self-hosting](docs/self-hosting.md). Install Git and Docker, then run the commands below.
- **Develop MANA:** use the [development guide](docs/development.md#getting-started).

```sh
git clone https://github.com/Duckinm/mana-community.git
cd mana-community
sh scripts/self-host.sh
```

Open [MANA](http://localhost:3300/register), create an account, and follow the verification link in the [local inbox](http://localhost:38025). Self-hosting includes the web app and API, with local database, file storage, and mail capture. The marketing site and MANA Cloud control panel are excluded. Core workflows have no Cloud subscription limits; AI and external integrations are optional. Unconfigured integrations show an explanation and keep their actions disabled; manual workflows remain available. This is a localhost preview; email stays in the local inbox. See [self-hosting](docs/self-hosting.md) for setup and troubleshooting.

## How it works

Start with a contact, organize the work in a project, prepare a quotation or invoice, and record the related income and expenses. Files, tasks, and calendar events help keep the work together. Use the interface directly or ask the in-app assistant to perform supported actions.

![A project task board in the self-hosted preview, using synthetic test data](docs/images/self-host-preview.png)

Settings → Appearance offers Default (100%), Large (105%), and Extra large (110%) interface sizes. Changes apply immediately to workspace text and controls and are remembered in the current browser.

| Familiar workflow | What MANA brings together | Benefit | Consideration |
| --- | --- | --- | --- |
| A contact list and task board | Contacts, projects, tasks, and calendar events | Keep the relationship and the work in one place | Designed around freelance work; evaluate your team's requirements |
| Invoice templates and spreadsheets | Quotations, invoices, receipts, and transaction records | Connect business documents with the work and its finances | Review financial details and local requirements before relying on a document |
| Folders of project files | Storage linked to projects and contacts | Keep supporting files near the relevant work | The local preview includes file storage; you maintain its disk capacity and backups |
| A chat assistant | Supported actions on MANA records; external tools can connect through [MCP](docs/mcp.md) | Turn an instruction into work in your workspace | AI can make mistakes; review its output and understand tool permissions |

See the [engineering reference](docs/development.md) for implementation and integration details.

## MANA Cloud

[MANA Cloud](https://app.heymana.app) is the hosted way to use MANA. Subscription plans and usage allowances are described on the [website](https://heymana.app).

Our community-first direction is a useful self-hosted application alongside an optional managed service. Cloud pays for hosted infrastructure and services. Self-hosted core features have no Cloud subscription limits. AI and external services require separate configuration and may incur provider costs.

| | Self-hosted local preview | MANA Cloud |
| --- | --- | --- |
| Operation | You run and update your installation | Managed by MANA |
| Data and integrations | You configure your infrastructure and service credentials | Uses the hosted service and its supported integrations |
| Costs | Your infrastructure and provider usage | Published plans and usage allowances |
| Support | Public documentation and community channels | See the published service terms and support information |

## Community and maintenance

We want MANA's direction to be shaped by the people using and contributing to it. Bug reports, practical examples, translations, documentation, design feedback, and code all help.

Our maintenance principles:

- Listen respectfully, ask for missing context, and explain decisions. A declined suggestion deserves a reason; a closed issue can be reconsidered when new evidence arrives.
- Keep priorities and contribution opportunities visible. Coordinate before taking over work that a contributor has claimed, and credit their contribution.
- Use agents to help triage, reproduce bugs, implement changes, and test. The planned workflow includes independent critique of both code and tests, with evidence attached to each proposed change.
- Keep the final merge decision with the project owner. Automated activity should be clearly identified, with unresolved findings visible to the reviewer.
- Prioritize reliable workflows and maintainable changes. Response times depend on maintainer capacity; donations do not purchase roadmap or merge decisions.

Start with [CONTRIBUTING](CONTRIBUTING.md) and the [issue tracker](https://github.com/Duckinm/mana-community/issues). Follow our [code of conduct](CODE_OF_CONDUCT.md); report vulnerabilities privately through [SECURITY](SECURITY.md). The [roadmap](ROADMAP.md) tracks the safeguards and pilot required before autonomous maintenance is enabled.

## Support MANA

Help by sharing a useful bug report, improving a translation, testing a release, or contributing documentation and code.

Want to buy the maintainers a coffee? A verified donation link will be added once the recipient and platform are confirmed. Financial support will be optional.

## License and copyright

Copyright © 2026 MANA.

MANA is licensed under the [GNU Affero General Public License, version 3 only](LICENSE) (`AGPL-3.0-only`). Contributors retain copyright in their contributions, which they submit under the same license. Third-party materials retain their existing licenses and notices.

See [licensing and ownership](docs/licensing.md) for contribution terms and use of the MANA name and logo.
