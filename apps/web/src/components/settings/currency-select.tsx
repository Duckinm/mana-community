import { Check, ChevronsUpDown } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CURRENCIES, resolveCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const QUICK_CODES = ["THB", "USD", "EUR"];

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
}

export function CurrencySelect({ value, onChange }: CurrencySelectProps) {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);
  const selected = resolveCurrency(value, CURRENCIES[0]);
  const quick = QUICK_CODES.map((code) =>
    CURRENCIES.find((c) => c.code === code),
  ).filter((c): c is (typeof CURRENCIES)[number] => Boolean(c));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {quick.map((c) => {
        const active = c.code === value;
        return (
          <button
            key={c.code}
            type="button"
            onClick={() => onChange(c.code)}
            aria-pressed={active}
            className={cn(
              "h-8 rounded-lg border px-3 text-sm transition-colors duration-base",
              active
                ? "bg-primary-soft border-primary-border text-primary"
                : "bg-surface-input border-border-subtle text-muted-foreground hover:border-border-default hover:text-foreground",
            )}
          >
            {c.symbol} {c.code}
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 justify-between px-3 text-sm font-normal"
          >
            {QUICK_CODES.includes(value)
              ? t("profile.currencyMore")
              : `${selected.symbol} ${selected.code}`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[16rem] p-0">
          <Command>
            <CommandInput placeholder={t("profile.currencySearch")} />
            <CommandList>
              <CommandEmpty>{t("profile.currencyEmpty")}</CommandEmpty>
              {CURRENCIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      c.code === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="w-6 text-caption">{c.symbol}</span>
                  <span className="font-medium">{c.code}</span>
                  <span className="truncate text-muted-foreground">{c.name}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
