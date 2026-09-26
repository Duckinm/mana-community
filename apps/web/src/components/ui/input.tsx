"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg px-4 py-3 text-sm [@media(pointer:coarse)]:h-11",
          "bg-card border border-input",
          "text-foreground placeholder:text-muted-foreground",
          "outline-none transition-colors duration-base",
          "focus:border-border-strong focus:bg-surface-raised",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
