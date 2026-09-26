"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "@/components/icons";
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  menuContent,
  menuDrawer,
  menuItem,
  menuMotion,
  menuSeparator,
} from "@/components/ui/menu-styles";
import { MenuDrawerOverlay } from "@/components/ui/menu-drawer-overlay";
import {
  composeRefs,
  useForceMenuDrawerStyle,
} from "@/hooks/use-force-menu-drawer-style";
import { useIsMobileNav } from "@/hooks/use-is-mobile-nav";

type SelectContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error("Select components must be used within Select");
  }
  return ctx;
}

function Select({
  open: openProp,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  const isMobile = useIsMobileNav();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  );
  const open = openProp ?? uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openProp],
  );

  return (
    <SelectContext.Provider
      value={{ open, onOpenChange: handleOpenChange, isMobile }}
    >
      <SelectPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
}

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

type SelectTriggerProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> & {
  size?: "default" | "sm";
  hideIcon?: boolean;
};

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, size = "default", hideIcon, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between border border-input bg-card text-left text-foreground data-[placeholder]:text-muted-foreground outline-none transition-colors duration-base cursor-pointer focus:border-border-strong focus:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 [&>span]:line-clamp-1",
      size === "sm"
        ? "h-8 rounded-lg px-3 py-1.5 text-xs [@media(pointer:coarse)]:h-11"
        : "h-10 rounded-lg px-4 py-3 text-sm [@media(pointer:coarse)]:h-11",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown
        className={cn("h-3.5 w-3.5 opacity-30 shrink-0", {
          hidden: hideIcon,
        })}
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-3.5 w-3.5 opacity-30" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-3.5 w-3.5 opacity-30" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const { open, onOpenChange, isMobile } = useSelectContext();
  const drawerRef = useForceMenuDrawerStyle(isMobile);

  return (
    <>
      {isMobile ? (
        <MenuDrawerOverlay
          open={open}
          onClose={() => onOpenChange(false)}
          className="fixed inset-0 z-[99] bg-surface-overlay/45 backdrop-blur-[2px] xl:hidden"
        />
      ) : null}
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={composeRefs(ref, drawerRef)}
          className={cn(
            "relative z-[100] overflow-y-auto overflow-x-hidden",
            !isMobile &&
              "max-h-[min(24rem,var(--radix-select-content-available-height))] origin-[--radix-select-content-transform-origin]",
            !isMobile && menuMotion,
            menuContent,
            menuDrawer,
            !isMobile &&
              position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            isMobile && "max-h-[min(70dvh,32rem)] p-2",
            className,
          )}
          // item-aligned renders a bare fixed-position wrapper that
          // useForceMenuDrawerStyle can't find, leaving a stray half-screen
          // block at the bottom. popper gives it the wrapper it looks for.
          position={position}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "p-1.5",
              !isMobile &&
                position === "popper" &&
                "w-full min-w-[var(--radix-select-trigger-width)]",
              isMobile && "w-full min-w-0 p-0",
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-7 pr-2 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      menuItem,
      "cursor-pointer pl-7 pr-2.5 focus:bg-surface-raised data-[highlighted]:bg-surface-raised",
      "max-xl:min-h-9 max-xl:rounded-xl max-xl:text-base",
      className,
    )}
    {...props}
  >
    <span className="absolute left-1.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn(menuSeparator, className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
