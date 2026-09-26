import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ManaLogoProps = ComponentProps<"img"> & {
  compact?: boolean;
};

export function ManaLogo({
  compact = false,
  className,
  alt = "MANA",
  ...props
}: ManaLogoProps) {
  const file = compact
    ? "mana-icon-128.png"
    : "mana-logo-landscape.png";

  return (
    <img
      src={`/logo/${file}`}
      alt={alt}
      className={cn("object-contain", className)}
      {...props}
    />
  );
}
