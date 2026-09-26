import { X } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterPillProps<T extends string> {
  label: string;
  options: FilterOption<T>[];
  value: T;
  defaultValue: T;
  onChange: (v: T) => void;
  getColor?: (v: T) => string | undefined;
  getSoftColor?: (v: T) => string | undefined;
}

export function FilterPill<T extends string>({
  label,
  options,
  value,
  defaultValue,
  onChange,
  getColor,
  getSoftColor,
}: FilterPillProps<T>) {
  const isActive = value !== defaultValue;
  const activeOption = options.find((o) => o.value === value);
  const activeColor = isActive && getColor ? getColor(value) : undefined;
  const activeSoftColor =
    isActive && getSoftColor ? getSoftColor(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-9 items-center gap-0 rounded-lg text-xs font-semibold transition-all",
            isActive ? "pl-1.5 pr-2" : "px-2.5",
          )}
          style={{
            background: isActive
              ? (activeSoftColor ?? "var(--primary-soft)")
              : "transparent",
            color: isActive
              ? (activeColor ?? "var(--primary)")
              : "var(--text-muted)",
            border: `1px solid ${
              isActive
                ? activeColor
                  ? "var(--border-strong)"
                  : "var(--primary-border)"
                : "var(--border-default)"
            }`,
          }}
        >
          {isActive && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(defaultValue);
              }}
              className="flex items-center justify-center mr-1 opacity-70 hover:opacity-100"
            >
              <X size={9} strokeWidth={2.5} />
            </span>
          )}
          <span className="opacity-60">{label}</span>
          {isActive && (
            <>
              <span className="mx-1.5 opacity-30">|</span>
              <span>{activeOption?.label}</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1">
        {options.map((opt) => {
          const optColor = getColor ? getColor(opt.value) : undefined;
          const optSoftColor = getSoftColor
            ? getSoftColor(opt.value)
            : undefined;
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-all"
              style={
                isSelected
                  ? {
                      background: optSoftColor ?? "var(--primary-soft)",
                      color: optColor ?? "var(--primary)",
                    }
                  : { color: "var(--text-muted)" }
              }
              onMouseEnter={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--surface-raised)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

interface ResetPillProps {
  onClick: () => void;
}

export function ResetPill({ onClick }: ResetPillProps) {
  const { t } = useTranslation("common");

  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all text-muted-foreground"
    >
      <X size={9} strokeWidth={2.5} />
      {t("reset")}
    </button>
  );
}
