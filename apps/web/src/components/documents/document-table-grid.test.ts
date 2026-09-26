import { expect, test } from "vitest";
import { gridTemplates } from "@/components/documents/document-table-list";

test("hiding a column drops its track at every breakpoint", () => {
  const all = gridTemplates(() => false) as Record<string, string>;
  expect(all["--doc-cols-base"]).toBe("4.25rem auto minmax(0,1fr) auto");
  expect(all["--doc-cols-lg"].split(" ")).toHaveLength(9);

  const noTotal = gridTemplates((id) => id === "total") as Record<
    string,
    string
  >;
  expect(noTotal["--doc-cols-sm"]).toBe("4.25rem auto minmax(0,1fr) auto");
  expect(noTotal["--doc-cols-lg"].split(" ")).toHaveLength(8);
});
