import { test, expect } from "bun:test";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("notice bundle preserves nested texts and excludes stale or linked outside files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mana-notices-"));
  try {
    const write = async (file: string, text: string) => {
      await Bun.write(join(directory, file), text);
    };
    await write("bun.lock", JSON.stringify({ packages: {
      fixture: ["fixture@1.0.0"],
      libvips: ["@img/sharp-libvips-test@1.0.0"],
      missing: ["missing@1.0.0"],
    } }));
    const fixture = "node_modules/.bun/fixture@1.0.0/node_modules/fixture";
    const libvips = "node_modules/.bun/libvips@1.0.0/node_modules/@img/sharp-libvips-test";
    await write(`${fixture}/package.json`, JSON.stringify({ name: "fixture", version: "1.0.0", license: "MIT" }));
    await write(`${fixture}/LICENSE`, "root copyright and terms\n");
    await write(`${fixture}/vendor/codec/COPYING.txt`, "nested upstream text\n");
    await write(`${fixture}/licenses/codec.txt`, "component license text\n");
    await write(`${fixture}/node_modules/other/LICENSE`, "separate dependency\n");
    await write("outside.txt", "outside sentinel\n");
    await symlink(join(directory, "outside.txt"), join(directory, fixture, "LICENSE-linked.txt"));
    await write(`${libvips}/package.json`, JSON.stringify({ name: "@img/sharp-libvips-test", version: "1.0.0" }));
    await write(`${libvips}/README.md`, "upstream component licensing table\n");
    await write(`${libvips}/versions.json`, '{"vips":"test"}\n');
    await write("node_modules/.bun/stale@0.1.0/node_modules/stale/package.json", JSON.stringify({ name: "stale", version: "0.1.0" }));
    await write("THIRD_PARTY_NOTICES.md", "source provenance\n");
    await write("licenses/source-mit.txt", "source upstream terms\n");
    const result = Bun.spawnSync([process.execPath, new URL("../../scripts/license-inventory.ts", import.meta.url).pathname, "bundle.json"], { cwd: directory });
    expect(result.exitCode).toBe(0);
    const bundle = await Bun.file(join(directory, "bundle.json")).json();
    expect(bundle.packages.map((item: { name: string }) => item.name)).toEqual(["@img/sharp-libvips-test", "fixture"]);
    expect(bundle.missingInstalledPackages).toEqual(["missing@1.0.0"]);
    expect(bundle.packages[1].notices).toEqual([
      { file: "LICENSE", text: "root copyright and terms\n" },
      { file: "licenses/codec.txt", text: "component license text\n" },
      { file: "vendor/codec/COPYING.txt", text: "nested upstream text\n" },
    ]);
    expect(bundle.packages[0].notices.map((notice: { file: string }) => notice.file)).toEqual(["README.md", "versions.json"]);
    expect(bundle.sourceNotices).toContainEqual({ file: "licenses/source-mit.txt", text: "source upstream terms\n" });
    expect(JSON.stringify(bundle)).not.toContain("outside sentinel");
    expect(bundle.lockfileSha256).toMatch(/^[a-f0-9]{64}$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
