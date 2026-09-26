import type { Document } from "@/components/documents/types";
import { applyDocumentDisplayStatus } from "@/lib/document-display-status";

export function parseSnapDoc(snapshotJson: string): Document | null {
  try {
    const snap = JSON.parse(snapshotJson) as {
      document?: Record<string, unknown>;
      items?: unknown[];
    };
    if (!snap.document) return null;
    return applyDocumentDisplayStatus({
      ...snap.document,
      items: snap.items ?? [],
    });
  } catch {
    return null;
  }
}

export function computeDiffFields(
  before: Document,
  after: Document,
): Set<string> {
  const keys = Object.keys(after) as (keyof Document)[];
  const changed = new Set<string>();
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.add(k);
  }
  return changed;
}
