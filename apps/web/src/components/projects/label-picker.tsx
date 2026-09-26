// LabelPicker — shared multi-select + create-on-the-fly label picker for tasks
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LABEL_COLORS } from "@/components/projects/constants";
import type { Label } from "@/components/projects/types";
import { useLabels } from "@/hooks/use-labels";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, Plus } from "@/components/icons";

interface LabelPickerProps {
  selected: Label[];
  onChange: (labels: Label[]) => void;
  children: React.ReactNode;
  align?: "start" | "end";
}

export function LabelPicker({ selected, onChange, children, align = "start" }: LabelPickerProps) {
  const { t } = useTranslation("projects");
  const { labels, createLabel } = useLabels();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);

  const selectedIds = new Set(selected.map((l) => l.id));

  function toggle(label: Label) {
    onChange(
      selectedIds.has(label.id)
        ? selected.filter((l) => l.id !== label.id)
        : [...selected, label],
    );
  }

  async function submitCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createLabel({ name: trimmed, color });
    if (!created) return;
    onChange([...selected, created]);
    setName("");
    setColor(LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)]);
    setCreating(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-2" align={align} onClick={(e) => e.stopPropagation()}>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {labels.length === 0 && !creating && (
            <p className="text-2xs text-muted-foreground px-2 py-1.5">{t("labelPicker.empty")}</p>
          )}
          {labels.map((label) => {
            const active = selectedIds.has(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-border-subtle text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: label.color }} />
                <span className="flex-1 truncate text-foreground">{label.name}</span>
                {active && <Check size={12} strokeWidth={2.5} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>

        {creating ? (
          <div className="mt-1.5 pt-1.5 border-t border-border space-y-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitCreate();
                }
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder={t("labelPicker.namePlaceholder")}
              className="h-7 text-xs"
            />
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-4 h-4 rounded-full shrink-0 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      boxShadow: color === c ? `0 0 0 2px var(--surface-overlay), 0 0 0 3px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={!name.trim()}
                className="text-2xs font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-80 disabled:opacity-30 bg-primary text-primary-foreground"
              >
                {t("labelPicker.create")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 mt-0.5 rounded-lg text-xs transition-colors hover:bg-border-subtle text-muted-foreground"
          >
            <Plus size={12} strokeWidth={2} />
            {t("labelPicker.newLabel")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
