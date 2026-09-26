import { Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/** Chip-style tag editor: comma-separated string field, edited as removable pills + an append button. */
export function TagsInput({ value, onChange, placeholder }: TagsInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="h-9 max-w-48"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-2.5"
          onClick={commit}
          disabled={!draft.trim()}
        >
          <Plus size={14} strokeWidth={2.5} />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary-border bg-primary-soft px-1.5 py-0.5 text-2xs font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="text-primary/60 hover:text-primary"
                aria-label={`Remove ${tag}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
