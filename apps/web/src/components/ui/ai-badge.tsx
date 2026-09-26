import { ManaSparkle } from "@/components/icons/mana-sparkle";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AiBadgeProps extends Omit<BadgeProps, "children" | "variant"> {
  label: ReactNode;
  icon?: boolean;
}

function AiBadge({
  label,
  icon = true,
  size = "pill-sm",
  className,
  ...props
}: AiBadgeProps) {
  const iconSize = size === "lg" ? 13 : size === "default" ? 11 : 9;

  return (
    <Badge
      variant="soft"
      size={size}
      className={cn(
        "gap-1 border-primary-border bg-primary-soft font-medium text-primary",
        size === "pill-sm" && "px-1.5 py-0.5",
        className,
      )}
      {...props}
    >
      {icon && <ManaSparkle size={iconSize} aria-hidden="true" />}
      <span>{label}</span>
    </Badge>
  );
}

export { AiBadge };
