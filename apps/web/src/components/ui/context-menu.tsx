"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronDown, ChevronRight, Circle } from "@/components/icons";
import {
  menuCheckboxItem,
  menuContent,
  menuDrawer,
  menuItem,
  menuLabel,
  menuMotion,
  menuRadioItem,
  menuSeparator,
  menuSubContent,
  menuSubTrigger,
} from "@/components/ui/menu-styles";
import { MenuDrawerOverlay } from "@/components/ui/menu-drawer-overlay";
import {
  composeRefs,
  useForceMenuDrawerStyle,
} from "@/hooks/use-force-menu-drawer-style";
import { useIsMobileNav } from "@/hooks/use-is-mobile-nav";
import { cn } from "@/lib/utils";

type ContextMenuContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  close: () => void;
};

const ContextMenuContext =
  React.createContext<ContextMenuContextValue | null>(null);

function useContextMenuContext() {
  const ctx = React.useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("ContextMenu components must be used within ContextMenu");
  }
  return ctx;
}

function ContextMenu({
  onOpenChange,
  modal,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  const isMobile = useIsMobileNav();
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const close = React.useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  }, []);

  return (
    <ContextMenuContext.Provider
      value={{ open, onOpenChange: handleOpenChange, isMobile, close }}
    >
      <ContextMenuPrimitive.Root
        onOpenChange={handleOpenChange}
        modal={modal ?? true}
        {...props}
      >
        {children}
      </ContextMenuPrimitive.Root>
    </ContextMenuContext.Provider>
  );
}

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => {
  const { isMobile } = useContextMenuContext();

  return (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        menuSubTrigger,
        inset && "pl-8",
        "max-xl:min-h-9 max-xl:rounded-xl max-xl:px-3 max-xl:text-base",
        className,
      )}
      {...props}
    >
      {children}
      {isMobile ? (
        <ChevronDown className="ml-auto size-3.5 text-muted-foreground/50" />
      ) : (
        <ChevronRight className="ml-auto size-3.5 text-muted-foreground/50" />
      )}
    </ContextMenuPrimitive.SubTrigger>
  );
});
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(
  (
    {
      className,
      sideOffset = 8,
      alignOffset = -4,
      collisionPadding = 16,
      ...props
    },
    ref,
  ) => {
    const { isMobile } = useContextMenuContext();
    const drawerRef = useForceMenuDrawerStyle(isMobile);

    if (isMobile) {
      return (
        <ContextMenuPrimitive.Portal>
          <ContextMenuPrimitive.SubContent
            ref={composeRefs(ref, drawerRef)}
            sideOffset={0}
            alignOffset={0}
            collisionPadding={0}
            avoidCollisions={false}
            className={cn(
              "z-[101] overflow-y-auto overflow-x-hidden p-2",
              menuSubContent,
              menuDrawer,
              className,
            )}
            {...props}
          />
        </ContextMenuPrimitive.Portal>
      );
    }

    return (
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.SubContent
          ref={ref}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          className={cn(
            "z-[90] origin-[--radix-context-menu-content-transform-origin]",
            menuMotion,
            menuSubContent,
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Portal>
    );
  },
);
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => {
  const { open, close, isMobile } = useContextMenuContext();
  const drawerRef = useForceMenuDrawerStyle(isMobile);

  return (
    <>
      {isMobile ? (
        <MenuDrawerOverlay
          open={open}
          onClose={close}
          className="fixed inset-0 z-[99] bg-surface-overlay/45 backdrop-blur-[2px] xl:hidden"
        />
      ) : null}
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          ref={composeRefs(ref, drawerRef)}
          className={cn(
            "z-[100] overflow-y-auto overflow-x-hidden",
            !isMobile &&
              "max-h-[--radix-context-menu-content-available-height] origin-[--radix-context-menu-content-transform-origin]",
            !isMobile && menuMotion,
            menuContent,
            menuDrawer,
            isMobile && "max-h-[min(70dvh,32rem)] p-2",
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Portal>
    </>
  );
});
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      menuItem,
      inset && "pl-8",
      "max-xl:min-h-9 max-xl:rounded-xl max-xl:px-3 max-xl:text-base",
      className,
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      menuCheckboxItem,
      "max-xl:min-h-9 max-xl:rounded-xl max-xl:text-base",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-1.5 flex size-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="size-3.5 text-primary" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      menuRadioItem,
      "max-xl:min-h-9 max-xl:rounded-xl max-xl:text-base",
      className,
    )}
    {...props}
  >
    <span className="absolute left-1.5 flex size-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="size-2 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(menuLabel, inset && "pl-8", className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn(menuSeparator, className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-2xs tracking-widest text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
