// Maps FileKind to a color + icon representation
import type { FileKind } from "@/components/storage/types";
import {
 Archive,
 File,
 FileImage,
 FileSpreadsheet,
 FileText,
 FileVideo,
} from "@/components/icons";

const KIND_META: Record<
 FileKind,
 { icon: React.ElementType; color: string; bg: string }
> = {
 pdf: { icon: FileText, color: "var(--danger)", bg: "var(--danger-soft)" },
 image: { icon: FileImage, color: "var(--primary)", bg: "var(--primary-soft)" },
 doc: { icon: FileText, color: "var(--category-purple)", bg: "var(--category-purple-soft)" },
 sheet: {
 icon: FileSpreadsheet,
 color: "var(--category-green)",
 bg: "var(--category-green-soft)",
 },
 video: { icon: FileVideo, color: "var(--category-orange)", bg: "var(--category-orange-soft)" },
 archive: {
 icon: Archive,
 color: "var(--accent)",
 bg: "var(--primary-soft)",
 },
 other: { icon: File, color: "var(--text-muted)", bg: "var(--surface-raised)" },
};

export function FileIcon({
  kind,
  size = 13,
}: {
  kind: FileKind;
  size?: number;
}) {
  const { icon: Icon, color, bg } = KIND_META[kind];
  return (
    <div
      className="flex size-7 shrink-0 items-center justify-center rounded-lg"
      style={{ background: bg }}
    >
      <Icon size={size} color={color} strokeWidth={1.5} />
    </div>
  );
}

export function kindColor(kind: FileKind) {
 return KIND_META[kind].color;
}
