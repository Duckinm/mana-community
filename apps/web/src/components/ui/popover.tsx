"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";
import { menuDrawer, menuSurface } from "@/components/ui/menu-styles";
import { MenuDrawerOverlay } from "@/components/ui/menu-drawer-overlay";
import {
  composeRefs,
  useForceMenuDrawerStyle,
} from "@/hooks/use-force-menu-drawer-style";
import { useIsMobileNav } from "@/hooks/use-is-mobile-nav";

type PopoverContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  return React.useContext(PopoverContext);
}

function Popover({
  open: openProp,
  defaultOpen,
  onOpenChange,
  modal,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
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
    <PopoverContext.Provider
      value={{ open, onOpenChange: handleOpenChange, isMobile }}
    >
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        modal={modal ?? isMobile}
        {...props}
      >
        {children}
      </PopoverPrimitive.Root>
    </PopoverContext.Provider>
  );
}

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    /** Keep floating popover on mobile (e.g. dense tooltips-like chrome). */
    disableDrawer?: boolean;
  }
>(
  (
    {
      className,
      align = "center",
      side,
      sideOffset = 4,
      collisionPadding = 16,
      disableDrawer = false,
      ...props
    },
    ref,
  ) => {
    const ctx = usePopoverContext();
    const isMobile = ctx?.isMobile ?? false;
    const asDrawer = isMobile && !disableDrawer;
    const drawerRef = useForceMenuDrawerStyle(asDrawer);

    return (
      <>
        {asDrawer && ctx ? (
          <MenuDrawerOverlay
            open={ctx.open}
            onClose={() => ctx.onOpenChange(false)}
            className="fixed inset-0 z-[99] bg-surface-overlay/45 backdrop-blur-[2px] xl:hidden"
          />
        ) : null}
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            ref={composeRefs(ref, drawerRef)}
            data-slot="popover-content"
            align={asDrawer ? "center" : align}
            side={asDrawer ? "bottom" : side}
            sideOffset={asDrawer ? 0 : sideOffset}
            collisionPadding={asDrawer ? 0 : collisionPadding}
            avoidCollisions={!asDrawer}
            className={cn(
              "z-[100] w-auto max-w-[calc(100vw-2rem)] p-0 text-foreground outline-none",
              !asDrawer &&
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
              menuSurface,
              asDrawer && menuDrawer,
              asDrawer &&
                "w-full max-w-none rounded-b-none border-x-0 border-b-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-modal",
              className,
              asDrawer && "!w-full !max-w-none",
            )}
            {...props}
          />
        </PopoverPrimitive.Portal>
      </>
    );
  },
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
