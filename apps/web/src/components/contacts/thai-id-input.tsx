import { digitsOnly, isValidThaiId } from "@/components/contacts/contact-schema";
import { Check, Eye, EyeOff } from "@/components/icons";
import { useRef, useState } from "react";

interface ThaiIdInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

/** 13 segmented digit boxes with a checksum tick that turns green once the mod-11 check passes. Masked by default — sensitive ID/VAT data. */
export function ThaiIdInput({ value, onChange, ariaLabel }: ThaiIdInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [revealed, setRevealed] = useState(false);
  const digits = digitsOnly(value).slice(0, 13);
  const valid = isValidThaiId(digits);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className="flex flex-1 items-center gap-0.5"
        aria-label={ariaLabel}
      >
        {Array.from({ length: 13 }).map((_, i) => {
          const groupGap =
            i === 1 || i === 5 || i === 10 || i === 12 ? "mr-1.5" : "";
          const char = digits[i];
          return (
            <span
              key={i}
              className={`flex h-8 flex-1 min-w-0 items-center justify-center rounded-md border font-mono text-sm tabular-nums ${groupGap} ${
                char
                  ? "border-border-default bg-surface-input text-foreground"
                  : "border-border-subtle bg-surface-input text-caption"
              }`}
            >
              {char ? (revealed ? char : "•") : "·"}
            </span>
          );
        })}
      </button>

      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ${
          valid
            ? "border-success-border bg-success-soft text-success"
            : "border-border-subtle text-caption"
        }`}
      >
        <Check size={13} strokeWidth={3} />
      </span>

      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption transition-colors hover:text-foreground"
        aria-label={revealed ? "Hide" : "Show"}
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>

      <input
        ref={inputRef}
        value={digits}
        onChange={(e) => onChange(digitsOnly(e.target.value).slice(0, 13))}
        inputMode="numeric"
        className="sr-only"
        aria-label={ariaLabel}
      />
    </div>
  );
}
