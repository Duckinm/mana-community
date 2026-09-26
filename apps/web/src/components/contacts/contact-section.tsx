import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ContactSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "list-shell list-shell-framed min-h-0 min-w-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ContactSectionHeader({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3 max-xl:px-4">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {action}
    </div>
  );
}

export function ContactSectionBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-4 max-xl:px-4 max-xl:py-3", className)}>
      {children}
    </div>
  );
}
