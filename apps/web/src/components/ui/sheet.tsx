import { motionEase } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type SheetSide = "left" | "right" | "bottom";

const DISMISS_DISTANCE = 88;
const DISMISS_VELOCITY = 520;

const panelTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.85,
};

function sheetMotion(side: SheetSide) {
  if (side === "left") {
    return {
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
    };
  }
  if (side === "right") {
    return {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
    };
  }
  return {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  };
}

const sideClasses: Record<SheetSide, string> = {
  left: "inset-y-0 left-0 h-dvh max-h-dvh border-r",
  right: "inset-y-0 right-0 h-dvh max-h-dvh border-l",
  bottom:
    "inset-x-0 bottom-0 top-auto h-auto max-h-[92dvh] rounded-t-2xl border-x-0 border-b-0 border-t",
};

function clampDrag(side: SheetSide, dx: number, dy: number) {
  if (side === "bottom") return { x: 0, y: Math.max(0, dy) };
  if (side === "right") return { x: Math.max(0, dx), y: 0 };
  return { x: Math.min(0, dx), y: 0 };
}

function shouldDismiss(
  side: SheetSide,
  offset: { x: number; y: number },
  velocity: { x: number; y: number },
) {
  if (side === "left") {
    return offset.x < -DISMISS_DISTANCE || velocity.x < -DISMISS_VELOCITY;
  }
  if (side === "right") {
    return offset.x > DISMISS_DISTANCE || velocity.x > DISMISS_VELOCITY;
  }
  return offset.y > DISMISS_DISTANCE || velocity.y > DISMISS_VELOCITY;
}

export function Sheet({
  open,
  onOpenChange,
  side,
  children,
  className,
  contentClassName,
  overlayClassName,
  showHandle = side === "bottom",
  overlay = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: SheetSide;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  showHandle?: boolean;
  overlay?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    velocityX: number;
    velocityY: number;
  } | null>(null);
  const motionProps = sheetMotion(side);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel) panel.style.translate = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previous = document.body.style.overflow;

    function syncLock() {
      if (!panel) return;
      const style = getComputedStyle(panel);
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        panel.getClientRects().length > 0;
      document.body.style.overflow = visible ? "hidden" : previous;
    }

    syncLock();
    const observer = new ResizeObserver(syncLock);
    observer.observe(document.documentElement);
    const container = panel.closest("[class*='@container']");
    if (container) observer.observe(container);
    window.addEventListener("resize", syncLock);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncLock);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function onHandlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocityX: 0,
      velocityY: 0,
    };
  }

  function onHandlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const dt = Math.max(now - drag.lastTime, 1);
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.velocityX = ((event.clientX - drag.lastX) / dt) * 1000;
    drag.velocityY = ((event.clientY - drag.lastY) / dt) * 1000;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    const offset = clampDrag(side, dx, dy);
    const panel = panelRef.current;
    if (panel) panel.style.translate = `${offset.x}px ${offset.y}px`;
  }

  function onHandlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const offset = clampDrag(
      side,
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );
    if (
      shouldDismiss(side, offset, {
        x: drag.velocityX,
        y: drag.velocityY,
      })
    ) {
      onOpenChange(false);
      return;
    }
    const panel = panelRef.current;
    if (panel) panel.style.translate = "";
  }

  const handlePointerProps = {
    onPointerDown: onHandlePointerDown,
    onPointerMove: onHandlePointerMove,
    onPointerUp: onHandlePointerUp,
    onPointerCancel: onHandlePointerUp,
  };

  const sheet = (
    // Direct keyed children, not a fragment: AnimatePresence only diffs its own
    // children, so a wrapper hands it one keyless node and the exit bookkeeping
    // never runs — the panel is dropped instead of animated out.
    <AnimatePresence>
      {open && overlay && (
        <motion.button
          key={`sheet-overlay-${side}`}
          type="button"
          aria-label="Close"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: motionEase }}
          className={cn(
            "fixed inset-0 z-[49] bg-surface-overlay/45 backdrop-blur-[2px]",
            overlayClassName,
          )}
          onClick={() => onOpenChange(false)}
        />
      )}
      {open && (
        <motion.div
          ref={panelRef}
          key={`sheet-panel-${side}`}
          role="dialog"
          aria-modal="true"
          initial={motionProps.initial}
          animate={motionProps.animate}
          exit={motionProps.exit}
          transition={panelTransition}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border-border bg-card shadow-modal",
            sideClasses[side],
            className,
          )}
        >
          {showHandle && (
            <div
              {...handlePointerProps}
              className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
            >
              <div className="h-1 w-10 rounded-full bg-border-strong" />
            </div>
          )}
          {!showHandle && (
            <div
              {...handlePointerProps}
              aria-hidden
              className={cn(
                "absolute z-20 touch-none",
                side === "left" && "inset-y-0 right-0 w-4",
                side === "right" && "inset-y-0 left-0 w-4",
                side === "bottom" && "inset-x-0 top-0 h-4",
              )}
            />
          )}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              contentClassName,
            )}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
}

export function SheetDragRegion({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={cn(className)}>{children}</div>;
}
