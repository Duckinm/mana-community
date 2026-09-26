import type { Transition } from "framer-motion";

export const motionEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const motionDurations = {
  fast: 0.14,
  base: 0.18,
  slow: 0.25,
} as const;

export function motionTransition(
  duration: number = motionDurations.slow,
  delay = 0,
): Transition {
  return delay ? { delay, duration, ease: motionEase } : { duration, ease: motionEase };
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: motionTransition(motionDurations.base),
};

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: motionTransition(),
};

export const panelFadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: motionTransition(),
};
