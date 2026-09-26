"use client";

import { useCallback, useRef, type Ref } from "react";

const DRAWER_CSS: Array<[string, string]> = [
  ["position", "fixed"],
  ["top", "auto"],
  ["right", "0px"],
  ["bottom", "0px"],
  ["left", "0px"],
  ["width", "100%"],
  ["min-width", "0px"],
  ["max-width", "100%"],
  ["max-height", "min(70dvh, 32rem)"],
  ["height", "auto"],
  ["transform", "none"],
  ["margin", "0px"],
  ["inset", "auto 0 0 0"],
  ["pointer-events", "auto"],
];

function applyDrawerStyles(node: HTMLElement) {
  // Popper wraps content in a transformed element — fixed positioning is then
  // relative to that wrapper, not the viewport. Style both.
  const wrapper = node.closest(
    "[data-radix-popper-content-wrapper]",
  ) as HTMLElement | null;
  const targets = wrapper ? [wrapper, node] : [node];

  for (const el of targets) {
    for (const [prop, value] of DRAWER_CSS) {
      el.style.setProperty(prop, value, "important");
    }
    el.style.setProperty("z-index", "100", "important");
  }

  // The drawer slides on `translate`, so only the wrapper may have it pinned —
  // locking it on the content node would freeze the slide flat.
  wrapper?.style.setProperty("translate", "none", "important");
}

/**
 * Radix Floating UI rewrites inline position on every frame. Re-assert bottom-drawer
 * styles with !important after each mutation so menus stay on-screen on mobile.
 */
export function useForceMenuDrawerStyle(enabled: boolean) {
  const observerRef = useRef<MutationObserver | null>(null);
  const rafRef = useRef(0);

  return useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      cancelAnimationFrame(rafRef.current);

      if (!node || !enabled) return;

      const wrapper = node.closest(
        "[data-radix-popper-content-wrapper]",
      ) as HTMLElement | null;

      const apply = () => {
        const observer = observerRef.current;
        observer?.disconnect();
        applyDrawerStyles(node);
        rafRef.current = requestAnimationFrame(() => {
          applyDrawerStyles(node);
          const observeTargets = [node, wrapper].filter(
            (el): el is HTMLElement => !!el,
          );
          for (const el of observeTargets) {
            observer?.observe(el, {
              attributes: true,
              attributeFilter: ["style"],
            });
          }
        });
      };

      const observer = new MutationObserver(apply);
      observerRef.current = observer;
      apply();
    },
    [enabled],
  );
}

export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}
