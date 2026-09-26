import { cn } from "@/lib/utils";
import * as React from "react";

export interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  ({ label, className, style, ...props }, ref) => {
    return (
      <div
        className={cn(
          "group relative flex items-center",
          label ? "h-[52px]" : "h-[42px]",
          props.disabled && "opacity-50",
        )}
      >
        {label && (
          <span className="text-sm font-medium whitespace-nowrap shrink-0 pr-4 text-ink max-w-[40%]">
            {label}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "peer block w-full border-0 bg-transparent pb-1 pt-1 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed",
            label ? "text-right" : "text-left",
            className,
          )}
          style={{
            color: "var(--text-primary)",
            caretColor: "var(--warning)",
            ...style,
          }}
          {...props}
        />
        <div className="absolute inset-x-0 bottom-0 transition-colors border-t border-dashed border-border-strong group-hover:[border-top-color:var(--text-muted)] group-focus-within:[border-top-color:var(--warning)]" />
      </div>
    );
  },
);
FieldInput.displayName = "FieldInput";
