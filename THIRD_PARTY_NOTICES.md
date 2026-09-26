# Third-party notices

MANA's original material uses `AGPL-3.0-only`. The upstream portions identified below retain their own copyright and license terms. The root license does not claim ownership of, or replace notices for, those portions.

## Copied and adapted source

| Upstream | Material in this repository | Preserved license |
| --- | --- | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | UI primitives under `apps/web/src/components/ui/`, including button, dialog, dropdown, select, and related shadcn-based wrappers; registry configuration in `apps/web/components.json` | [MIT, copyright 2023 shadcn](licenses/shadcn-ui-mit.txt) |
| [Dice UI](https://github.com/sadmann7/diceui) | Adapted `apps/web/src/components/ui/kanban.tsx`, `sortable.tsx`, and `apps/web/src/lib/compose-refs.ts` | [MIT, copyright 2024 Sadman Sakib](licenses/dice-ui-mit.txt) |
| [Radix Primitives](https://github.com/radix-ui/primitives) | `apps/web/src/hooks/use-callback-ref.ts` cites Radix directly; composed-ref utilities also contain Radix-derived implementation | [MIT, copyright 2022 WorkOS](licenses/radix-primitives-mit.txt) |

These descriptions apply to upstream portions, not a claim that every file in the UI directory comes from one upstream project. Local modifications are present. The exact original registry download revisions were not recorded; comparison with current primary upstream source confirms the Dice UI derivations. All three license texts were retrieved from the respective official repositories on 2026-09-26 and preserved without modification:

| Upstream license path | Git blob identity |
| --- | --- |
| `shadcn-ui/ui/LICENSE.md` | `fad4d887a681dd49233e5ed01ee2c7a1513089a0` |
| `sadmann7/diceui/LICENSE` | `6a059f7e2465f9b3f7d5e85f21a7ca7e8e449894` |
| `radix-ui/primitives/LICENSE` | `a18858fb7b014098cba85703e66609be66a26ef5` |

Keep this file and the linked license texts when redistributing the corresponding source portions.

## Installed dependencies and built artifacts

Registry dependencies are recorded in `bun.lock` and retain their upstream licenses. Their presence in the lockfile does not relicense them under AGPL. Source releases do not include `node_modules`, container OS packages, or prebuilt images.

Local image builds generate `/app/third-party-notices.json` using `scripts/license-inventory.ts`. It preserves available root and nested notice text with package-relative paths, exact installed versions matching the lockfile, copied-source notices, and available Debian package copyright files. Fontsource font licenses are collected from the installed packages. Sharp/libvips component licensing appears in its package README; the bundle includes that README and `versions.json` as well.

The bundle identifies its lockfile hash, platform, and architecture. Record the final image digest alongside it when distributing a binary. Packages not installed for that target are listed separately. Do not treat a package lacking a license metadata field as unlicensed or as implicitly AGPL; inspect its actual notice files.

The first release is source-only. Publishing binaries requires an additional review of the actual artifact, including any missing upstream texts, source availability, modification/relinking requirements, and notices for system packages. This generated bundle preserves evidence and available texts; it is not a declaration that every redistribution obligation has been fulfilled.
