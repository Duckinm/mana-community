"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
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

type DropdownMenuContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
};

const DropdownMenuContext =
  React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error("DropdownMenu components must be used within DropdownMenu");
  }
  return ctx;
}

function DropdownMenu({
  open: openProp,
  defaultOpen,
  onOpenChange,
  modal,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
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
    <DropdownMenuContext.Provider
      value={{ open, onOpenChange: handleOpenChange, isMobile }}
    >
      <DropdownMenuPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        modal={modal ?? isMobile}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Root>
    </DropdownMenuContext.Provider>
  );
}

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => {
  const { isMobile } = useDropdownMenuContext();

  return (
    <DropdownMenuPrimitive.SubTrigger
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
    </DropdownMenuPrimitive.SubTrigger>
  );
});
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
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
    const { isMobile } = useDropdownMenuContext();
    const drawerRef = useForceMenuDrawerStyle(isMobile);

    if (isMobile) {
      return (
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.SubContent
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
        </DropdownMenuPrimitive.Portal>
      );
    }

    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
          ref={ref}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          className={cn(
            "z-[90] origin-[--radix-dropdown-menu-content-transform-origin]",
            menuMotion,
            menuSubContent,
            className,
          )}
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    );
  },
);
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => {
  const { open, onOpenChange, isMobile } = useDropdownMenuContext();
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
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={composeRefs(ref, drawerRef)}
          sideOffset={isMobile ? 0 : sideOffset}
          collisionPadding={isMobile ? 0 : undefined}
          avoidCollisions={!isMobile}
          className={cn(
            "z-[100] overflow-y-auto overflow-x-hidden",
            !isMobile &&
              "max-h-[var(--radix-dropdown-menu-content-available-height)] origin-[--radix-dropdown-menu-content-transform-origin]",
            !isMobile && menuMotion,
            menuContent,
            menuDrawer,
            isMobile && "max-h-[min(70dvh,32rem)] p-2",
            className,
          )}
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    </>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
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
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
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
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="size-3.5 text-primary" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      menuRadioItem,
      "max-xl:min-h-9 max-xl:rounded-xl max-xl:text-base",
      className,
    )}
    {...props}
  >
    <span className="absolute left-1.5 flex size-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="size-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(menuLabel, inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(menuSeparator, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
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
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
