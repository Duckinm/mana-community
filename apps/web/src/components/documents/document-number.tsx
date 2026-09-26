import type { DocumentType } from "@/components/documents/types";
import { DOCUMENT_TYPE_COLOR } from "@/components/documents/document-type-color";

// Numbers read as <alias><rest>, e.g. QO-2026-013 or QO2607015. Only the alias
// carries the type colour — it replaces the old separate type badge.
export function DocumentNumber({
  number,
  type,
  className,
}: {
  number: string;
  type: DocumentType;
  className?: string;
}) {
  const alias = number.match(/^[A-Za-z]+/)?.[0] ?? "";
  return (
    <span className={className}>
      <span style={{ color: DOCUMENT_TYPE_COLOR[type] }}>{alias}</span>
      {number.slice(alias.length)}
    </span>
  );
}
