import { Eye, EyeOff } from "@/components/icons";
import { useEffect, useRef, useState } from "react";

const AUTO_HIDE_MS = 5000;

/** Sensitive ID value — masked by default, reveals on click, auto-hides after 5s. */
export function MaskedIdValue({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function toggle() {
    if (revealed) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setRevealed(false);
      return;
    }
    setRevealed(true);
    timeoutRef.current = setTimeout(() => setRevealed(false), AUTO_HIDE_MS);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono tabular-nums">
        {revealed ? value : "•".repeat(value.length)}
      </span>
      <button
        type="button"
        onClick={toggle}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-caption transition-colors hover:text-foreground"
        aria-label={revealed ? "Hide" : "Show"}
      >
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  );
}
