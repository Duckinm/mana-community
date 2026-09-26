// LabelChip — shared label badge, aligned to the soft-tint + border badge doctrine
import type { Label } from "@/components/projects/types";
import { cn } from "@/lib/utils";

interface LabelChipProps {
  label: Pick<Label, "name" | "color">;
  size?: "default" | "sm";
  truncate?: boolean;
  className?: string;
}

export function LabelChip({ label, size = "default", truncate = true, className }: LabelChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium shrink-0 rounded-md border",
        size === "sm" ? "text-2xs px-1.5 py-0.5" : "text-xs px-2 py-0.5",
        className,
      )}
      style={{
        background: `color-mix(in srgb, ${label.color} 12%, var(--surface-card))`,
        borderColor: `color-mix(in srgb, ${label.color} 35%, transparent)`,
        color: label.color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: label.color }} />
      <span className={truncate ? "truncate" : "whitespace-nowrap"}>{label.name}</span>
    </span>
  );
}
