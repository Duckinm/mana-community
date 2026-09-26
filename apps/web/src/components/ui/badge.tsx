import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-semibold shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary border border-primary-border",
        solid: "bg-primary text-primary-foreground",
        soft: "bg-primary-soft text-primary border border-primary-border",
        secondary: "bg-surface-raised text-foreground",
        muted: "bg-surface-raised text-caption",
        success: "bg-success-soft text-success border border-success-border",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        outline: "border border-border-default text-foreground bg-transparent",
        purple: "bg-category-purple-soft text-category-purple",
        code: "bg-primary-soft text-primary font-mono",
      },
      size: {
        default: "text-xs px-2 py-0.5 rounded-md",
        sm: "text-2xs px-1.5 py-0.5 rounded",
        lg: "text-sm px-3 py-1 rounded-lg",
        pill: "text-xs px-2.5 py-1 rounded-full",
        "pill-sm": "text-2xs px-2 py-1 rounded-full",
      },
    },
    defaultVariants: {
      variant: "soft",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

const statusDotVariants = cva("rounded-full shrink-0", {
  variants: {
    status: {
      active: "bg-success",
      inactive: "bg-muted-foreground",
      warning: "bg-warning",
      danger: "bg-danger",
    },
    size: {
      default: "w-1.5 h-1.5",
      sm: "w-1 h-1",
      lg: "w-2 h-2",
    },
  },
  defaultVariants: { status: "active", size: "default" },
});

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {}

function StatusDot({ className, status, size, ...props }: StatusDotProps) {
  return (
    <span
      className={cn(statusDotVariants({ status, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, StatusDot, statusDotVariants };
