import { Check, ChevronsUpDown } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const IANA_ZONES: string[] = Intl.supportedValuesOf("timeZone");

function zoneTime(zone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  } catch {
    return "";
  }
}

interface TimezoneSelectProps {
  value: string;
  onChange: (zone: string) => void;
}

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, [open]);

  const selectedTime = useMemo(
    () => (value ? zoneTime(value, now) : ""),
    [value, now],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full max-w-xs justify-between px-3 text-sm font-normal"
        >
          <span className="truncate">
            {value || t("profile.timezonePlaceholder")}
            {selectedTime && (
              <span className="ml-2 text-caption tabular-nums">
                {selectedTime}
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[--radix-popover-trigger-width] min-w-[min(16rem,calc(100vw-2rem))] p-0"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={t("profile.timezoneSearch")} />
          <CommandList>
            <CommandEmpty>{t("profile.timezoneEmpty")}</CommandEmpty>
            {IANA_ZONES.map((zone) => (
              <CommandItem
                key={zone}
                value={zone}
                onSelect={() => {
                  onChange(zone);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    zone === value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1 truncate">
                  {zone.replace(/_/g, " ")}
                </span>
                <span className="text-caption tabular-nums">
                  {zoneTime(zone, now)}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
