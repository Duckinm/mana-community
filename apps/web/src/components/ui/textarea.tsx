"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[5rem] w-full rounded-lg px-4 py-3 text-sm",
        "bg-card border border-input",
        "text-foreground placeholder:text-muted-foreground",
        "outline-none transition-colors duration-base resize-none",
        "focus:border-border-strong focus:bg-surface-raised",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
