import { cn } from "@/lib/utils";

interface Props {
  value: number;
  max: number;
  warnAt?: number;
}

const RADIUS = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function FeedbackCharRing({ value, max, warnAt = 0.8 }: Props) {
  const ratio = Math.min(value / max, 1);
  if (ratio < warnAt) return null;

  const danger = ratio >= 0.95;
  const remaining = max - value;

  return (
    <div
      className="flex items-center gap-1.5"
      title={`${remaining} characters left`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          className="stroke-border-subtle"
        />
        <circle
          cx="10"
          cy="10"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          className={cn(
            "transition-[stroke-dashoffset] duration-fast",
            danger ? "stroke-danger" : "stroke-warning",
          )}
        />
      </svg>
      <span
        className={cn(
          "text-2xs tabular-nums",
          danger ? "text-danger" : "text-warning",
        )}
      >
        {remaining}
      </span>
    </div>
  );
}
