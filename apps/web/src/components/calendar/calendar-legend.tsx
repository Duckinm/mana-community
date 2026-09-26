import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useCalendarConnection } from "@/hooks/use-calendar-connection";
import type {
  CalendarDisplayOption,
  CalendarDisplayOptions,
} from "@/components/calendar/calendar-display-options";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LEGEND_ITEMS: {
  id: CalendarDisplayOption;
  labelKey: string;
  className: string;
}[] = [
  { id: "tasks", labelKey: "legend.task", className: "calendar-legend-task" },
  { id: "milestones", labelKey: "legend.milestone", className: "calendar-legend-milestone" },
  { id: "documents", labelKey: "legend.document", className: "calendar-legend-document" },
  {
    id: "dueSoon",
    labelKey: "legend.documentSoon",
    className: "calendar-legend-document-soon",
  },
  {
    id: "overdue",
    labelKey: "legend.documentCritical",
    className: "calendar-legend-document-critical",
  },
  {
    id: "recurring",
    labelKey: "legend.documentRecurring",
    className: "calendar-legend-document-recurring",
  },
];

function LegendPill({
  active,
  onClick,
  swatch,
  children,
}: {
  active: boolean;
  onClick: () => void;
  swatch: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors",
        active
          ? "border-border-default bg-surface-overlay text-foreground"
          : "border-transparent bg-transparent text-muted-foreground/55 hover:bg-surface-overlay hover:text-muted-foreground",
      )}
    >
      <span className={cn("inline-flex shrink-0", !active && "grayscale opacity-40")}>
        {swatch}
      </span>
      {children}
    </button>
  );
}

function GoogleLegendItem({
  emails,
  accountColorMap,
  active,
  onClick,
}: {
  emails: string[];
  accountColorMap: Map<string, string>;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation("calendar");
  // One swatch per account clutters the strip once a user links several, so the
  // legend stays a single Google chip and the accounts move into the tooltip.
  const soloColor =
    emails.length === 1 ? accountColorMap.get(emails[0]) : undefined;

  const item = (
    <LegendPill
      active={active}
      onClick={onClick}
      swatch={
        <span
          className={cn("size-3 shrink-0 rounded border", !soloColor && "calendar-legend-google")}
        style={
          soloColor
            ? {
                background: `color-mix(in srgb, var(${soloColor}) 18%, var(--surface-raised))`,
                borderColor: `color-mix(in srgb, var(${soloColor}) 45%, var(--border-subtle))`,
              }
            : undefined
        }
          aria-hidden
        />
      }
    >
      {t("legend.google")}
    </LegendPill>
  );

  if (emails.length === 0) return item;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent side="top">
        {emails.map((email) => (
          <p key={email}>{email}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

type CalendarLegendProps = {
  accountColorMap: Map<string, string>;
  options: CalendarDisplayOptions;
  onToggle: (option: CalendarDisplayOption) => void;
};

export function CalendarLegend({
  accountColorMap,
  options,
  onToggle,
}: CalendarLegendProps) {
  const { t } = useTranslation("calendar");
  const { connection } = useCalendarConnection();
  const accounts = connection?.calendars ?? [];
  const uniqueAccountEmails = [
    ...new Set(accounts.map((c) => c.accountEmail).filter((email): email is string => !!email)),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      <LegendPill
        active={options.native}
        onClick={() => onToggle("native")}
        swatch={<span className="size-3 shrink-0 rounded border calendar-legend-native" aria-hidden />}
      >
        {t("legend.native")}
      </LegendPill>
      <GoogleLegendItem
        emails={uniqueAccountEmails}
        accountColorMap={accountColorMap}
        active={options.google}
        onClick={() => onToggle("google")}
      />

      {LEGEND_ITEMS.map((item) => (
        <LegendPill
          key={item.id}
          active={options[item.id]}
          onClick={() => onToggle(item.id)}
          swatch={<span className={cn("size-3 shrink-0 rounded border", item.className)} aria-hidden />}
        >
          {t(item.labelKey)}
        </LegendPill>
      ))}
    </div>
  );
}
