import { readdir, mkdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";

const lockText = await Bun.file("bun.lock").text();
const lock = Bun.JSONC.parse(lockText) as {
  packages: Record<string, [string, ...unknown[]]>;
};
const locked = new Set(Object.values(lock.packages).map(([id]) => id));
const packages = new Map<string, {
  name: string;
  version: string;
  declaredLicense: unknown;
  notices: Array<{ file: string; text: string }>;
}>();

for (const entry of await readdir("node_modules/.bun", { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === "node_modules") continue;
  const modules = join("node_modules/.bun", entry.name, "node_modules");
  const files = ["*/package.json", "@*/*/package.json"].flatMap((pattern) =>
    [...new Bun.Glob(pattern).scanSync({ cwd: modules, followSymlinks: true })],
  );
  for (const file of files) {
    const path = join(modules, file);
    const manifest = await Bun.file(path).json();
    const id = `${manifest.name}@${manifest.version}`;
    if (!locked.has(id) || packages.has(id)) continue;
    const notices = [];
    for await (const notice of new Bun.Glob("**/*").scan({ cwd: dirname(path), onlyFiles: true, followSymlinks: false })) {
      if (notice.split("/").includes("node_modules")) continue;
      const namedNotice = /(licen[cs]e|copying|notice|copyright|^ofl)([._-]|$)/i.test(basename(notice));
      const inNoticeDirectory = notice.split("/").slice(0, -1).some((part) => /^(licen[cs]es?|notices?)$/i.test(part));
      // libvips publishes its component licensing table in README rather than LICENSE.
      const libvipsMetadata = manifest.name.startsWith("@img/sharp-libvips-") && ["README.md", "versions.json"].includes(notice);
      if (!namedNotice && !inNoticeDirectory && !libvipsMetadata) continue;
      notices.push({ file: notice, text: await Bun.file(join(dirname(path), notice)).text() });
    }
    notices.sort((a, b) => a.file.localeCompare(b.file));
    packages.set(id, {
      name: manifest.name,
      version: manifest.version,
      declaredLicense: manifest.license ?? manifest.licenses ?? null,
      notices,
    });
  }
}

if (packages.size === 0) throw new Error("No installed packages matched bun.lock. Run bun install --frozen-lockfile first.");

const sourceNotices = [];
for (const path of ["THIRD_PARTY_NOTICES.md", ...new Bun.Glob("licenses/**/*").scanSync({ onlyFiles: true, followSymlinks: false })]) {
  if (await Bun.file(path).exists()) sourceNotices.push({ file: path, text: await Bun.file(path).text() });
}
const osNotices = [];
let osPackages = null;
if (Bun.which("dpkg-query")) {
  const query = Bun.spawnSync(["dpkg-query", "-W", "-f=${binary:Package}\t${Version}\t${Architecture}\n"]);
  if (query.exitCode !== 0) throw new Error("Cannot inventory installed Debian packages");
  osPackages = query.stdout.toString().trim().split("\n").map((line) => {
    const [name, version, architecture] = line.split("\t");
    return { name, version, architecture };
  });
  for await (const file of new Bun.Glob("*/copyright").scan({ cwd: "/usr/share/doc", followSymlinks: true })) {
    osNotices.push({ file: `/usr/share/doc/${file}`, text: await Bun.file(`/usr/share/doc/${file}`).text() });
  }
}
const result = {
  lockfileSha256: new Bun.CryptoHasher("sha256").update(lockText).digest("hex"),
  scope: "Installed packages matching bun.lock, bundled source notices, and available Debian package copyright files. Uninstalled platforms, missing upstream texts, source/relinking obligations, and other artifacts need separate review. This is a notice bundle, not a compatibility judgment.",
  platform: process.platform,
  architecture: process.arch,
  osRelease: await Bun.file("/etc/os-release").exists() ? await Bun.file("/etc/os-release").text() : null,
  osPackages,
  osNotices,
  sourceNotices,
  packages: [...packages.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)),
  missingInstalledPackages: [...locked].filter((id) => !packages.has(id)).sort(),
};
const output = process.argv[2] ?? "output/license-inventory.json";
await mkdir(dirname(output), { recursive: true });
await Bun.write(output, JSON.stringify(result, null, 2) + "\n");
console.log(`${packages.size} locked installed packages; ${result.missingInstalledPackages.length} not installed; inventory and available notices written to ${output}`);
