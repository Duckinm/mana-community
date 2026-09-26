// DateRangePicker — popover + calendar range selector styled to match the app theme
import { Calendar as CalendarIcon, X } from "@/components/icons";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  calendarDateFromPicker,
  calendarDateToPicker,
  formatCalendarDateShort,
} from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  from: string | undefined;
  to: string | undefined;
  onFromChange: (v: string | undefined) => void;
  onToChange: (v: string | undefined) => void;
  onClear: () => void;
  align?: "start" | "center" | "end";
  placeholder: string;
  className?: string;
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  align = "end",
  placeholder,
  className,
}: DateRangePickerProps) {
  const hasRange = from || to;
  const range: DateRange = {
    from: calendarDateToPicker(from),
    to: calendarDateToPicker(to),
  };

  function handleSelect(r: DateRange | undefined) {
    onFromChange(calendarDateFromPicker(r?.from));
    onToChange(calendarDateFromPicker(r?.to));
  }

  const label = hasRange
    ? `${from ? formatCalendarDateShort(from) : "…"} – ${to ? formatCalendarDateShort(to) : "…"}`
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all",
            hasRange ? "text-primary" : "text-muted-foreground",
            className,
          )}
          style={{
            background: hasRange ? "var(--primary-soft)" : "transparent",
            border: `1px solid ${hasRange ? "var(--primary-border)" : "var(--border-default)"}`,
          }}
        >
          <CalendarIcon size={11} strokeWidth={2} className="shrink-0" />
          {label}
          {hasRange && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="ml-0.5 opacity-60 hover:opacity-100 flex items-center"
            >
              <X size={9} strokeWidth={2.5} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto overflow-hidden">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
