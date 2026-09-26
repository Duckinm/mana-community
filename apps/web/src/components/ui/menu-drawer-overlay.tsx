"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MenuDrawerOverlay({
  open,
  onClose,
  className = "fixed inset-0 z-[99] bg-surface-overlay/45 backdrop-blur-[2px] xl:hidden",
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    // Outlive the drawer's slide-out, or the scrim blinks away a beat before
    // the sheet has finished leaving.
    const timer = setTimeout(() => setMounted(false), 180);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <button
      type="button"
      aria-label="Close"
      data-state={open ? "open" : "closed"}
      className={cn("menu-drawer-scrim", className)}
      onClick={onClose}
    />,
    document.body,
  );
}
