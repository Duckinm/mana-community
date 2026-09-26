import { describe, expect, it } from "vitest";
import {
  sortDocumentsByIssueDate,
  sortDocumentsForFlatView,
} from "@/components/documents/document-table-sort";
import type { Document } from "@/components/documents/types";

describe("sortDocumentsByIssueDate", () => {
  it("sorts newest issue date first, uses updated time for ties, and puts missing dates last", () => {
    const documents = [
      { id: "missing", issueDate: null, updatedAt: "2026-07-28T12:00:00Z" },
      {
        id: "older",
        issueDate: "2026-06-01",
        updatedAt: "2026-07-28T12:00:00Z",
      },
      {
        id: "newer-old-update",
        issueDate: "2026-07-01",
        updatedAt: "2026-07-27T12:00:00Z",
      },
      {
        id: "newer-new-update",
        issueDate: "2026-07-01",
        updatedAt: "2026-07-28T12:00:00Z",
      },
    ];

    expect(sortDocumentsByIssueDate(documents).map((doc) => doc.id)).toEqual([
      "newer-new-update",
      "newer-old-update",
      "older",
      "missing",
    ]);
    expect(documents[0]?.id).toBe("missing");
  });

  it("sorts the displayed document, project, and due-date fields", () => {
    const documents = [
      {
        id: "a",
        number: "INV-10",
        projectName: "Alpha",
        dueDate: "2026-08-03",
      },
      {
        id: "b",
        number: "INV-2",
        projectName: "Zeta",
        dueDate: "2026-08-01",
      },
    ] as Document[];

    expect(
      sortDocumentsForFlatView(documents, [
        { id: "document", desc: false },
      ]).map((doc) => doc.id),
    ).toEqual(["b", "a"]);
    expect(
      sortDocumentsForFlatView(documents, [
        { id: "project", desc: false },
      ]).map((doc) => doc.id),
    ).toEqual(["a", "b"]);
    expect(
      sortDocumentsForFlatView(documents, [
        { id: "dueDate", desc: false },
      ]).map((doc) => doc.id),
    ).toEqual(["b", "a"]);
  });
});
