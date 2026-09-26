import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary-soft border border-primary-border text-primary hover:bg-primary-border",
        solid: "bg-primary text-primary-foreground hover:opacity-90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-soft":
          "bg-danger-soft text-danger hover:bg-danger-soft/80 border border-danger-soft",
        outline:
          "border border-border-default bg-surface-card text-foreground hover:bg-surface-raised",
        secondary:
          "bg-surface-raised text-foreground hover:bg-surface-raised/80",
        ghost:
          "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
        "ghost-danger":
          "text-muted-foreground hover:bg-danger-soft hover:text-danger",
        link: "text-primary underline-offset-4 hover:underline motion-safe:active:scale-100",
        // Always sits on a warning-soft panel, so the fill is a neutral raised
        // surface — an amber-on-amber button loses its edge, and a bare bright
        // fill would read as a second "click me" accent next to primary blue.
        warning:
          "bg-surface-raised border border-warning-border text-foreground hover:bg-warning-soft hover:border-warning",
      },
      size: {
        default:
          "h-10 px-4 py-2 rounded-xl text-sm leading-4 tracking-normal [@media(pointer:coarse)]:h-11",
        sm: "h-[30.5px] px-3 py-1.5 rounded-lg text-xs [@media(pointer:coarse)]:h-9",
        xs: "h-6 px-2 py-0.5 rounded-md text-2xs [@media(pointer:coarse)]:h-9",
        lg: "h-11 px-8 rounded-xl text-sm",
        xl: "py-4 px-6 rounded-2xl text-sm font-semibold",
        icon: "h-10 w-10 rounded-xl [@media(pointer:coarse)]:size-11 [@media(pointer:coarse)]:rounded-lg",
        "icon-sm":
          "h-7 w-7 rounded-lg [@media(pointer:coarse)]:size-9",
        "icon-xs":
          "h-6 w-6 rounded-md [@media(pointer:coarse)]:size-9 [@media(pointer:coarse)]:rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
