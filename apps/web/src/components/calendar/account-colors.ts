const ACCOUNT_COLOR_VARS = [
  "--info",
  "--category-purple",
  "--category-orange",
  "--success",
  "--category-green",
  "--danger",
] as const;

export function buildAccountColorMap(
  accountEmails: (string | null | undefined)[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const email of accountEmails) {
    if (!email || map.has(email)) continue;
    map.set(email, ACCOUNT_COLOR_VARS[map.size % ACCOUNT_COLOR_VARS.length]);
  }
  return map;
}

export function accountColorVar(
  accountEmail: string | null | undefined,
  colorMap: Map<string, string>,
): string {
  if (!accountEmail) return "--info";
  return colorMap.get(accountEmail) ?? "--info";
}
