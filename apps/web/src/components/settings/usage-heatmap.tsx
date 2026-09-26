import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RotateCw } from "@/components/icons";
import { UsageHeatmapSkeleton } from "@/components/settings/usage-heatmap-skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  addCalendarDays,
  formatCalendarDate,
  todayCalendarDate,
} from "@/lib/calendar-date";
import { client, expectEden } from "@/lib/eden";
import { formatBytes } from "@/lib/format-bytes";
import { formatTimestamp, formatTimestampDistance } from "@/lib/timestamp";

const WEEKS = 53;
const CELL_PX = 11;
const GAP_PX = 3;
const ROW_LABEL_DAYS = [0, 2, 4]; // Mon, Wed, Fri (Monday-first week index)

type DailyDay = {
  day: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
};

function formatCompactTokens(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function buildGrid(weeksCount: number) {
  const todayStr = todayCalendarDate();
  const today = new Date(`${todayStr}T00:00:00`);
  const mondayIndex = (today.getDay() + 6) % 7;
  const gridEnd = addCalendarDays(todayStr, 6 - mondayIndex);
  const gridStart = addCalendarDays(gridEnd, -(weeksCount * 7 - 1));
  const days: string[] = [];
  for (let i = 0; i < weeksCount * 7; i++)
    days.push(addCalendarDays(gridStart, i));
  const weekStarts: string[] = [];
  for (let w = 0; w < weeksCount; w++) weekStarts.push(days[w * 7]);
  return { days, weekStarts, todayStr };
}

function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 0) return 1;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

const LEVEL_CLASSES = [
  "bg-muted",
  "bg-primary/20",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
] as const;

type RangeFilter = "all" | "7d" | "30d";

export function UsageHeatmap({ className = "" }: { className?: string }) {
  const { t } = useTranslation("settings");

  const {
    data: usage,
    refetch,
    isFetching,
    isPending: usagePending,
  } = useQuery({
    queryKey: ["billing", "usage"],
    queryFn: async () => expectEden(await client.api.billing.usage.get()),
  });

  const { data: daily, isPending: dailyPending } = useQuery({
    queryKey: ["billing", "usage", "daily"],
    queryFn: async () => expectEden(await client.api.billing.usage.daily.get()),
  });

  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const [spinning, setSpinning] = useState(false);
  function handleRefresh() {
    setSpinning(true);
    Promise.all([
      refetch(),
      new Promise((resolve) => setTimeout(resolve, 500)),
    ]).finally(() => setSpinning(false));
  }

  const [range, setRange] = useState<RangeFilter>("all");

  const { days, weekStarts, todayStr } = useMemo(() => buildGrid(WEEKS), []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollFade, setScrollFade] = useState({ left: false, right: false });

  function updateScrollFade() {
    const el = scrollRef.current;
    if (!el) return;
    setScrollFade({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }

  // Grid is oldest-to-newest left-to-right — default to showing the most recent months.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    updateScrollFade();
  }, [days.length]);

  const dayMap = useMemo(() => {
    const map = new Map<string, DailyDay>();
    for (const d of daily?.days ?? []) map.set(d.day, d);
    return map;
  }, [daily]);

  const maxCount = useMemo(
    () => Math.max(0, ...(daily?.days ?? []).map((d) => d.count)),
    [daily],
  );

  const filteredDays = useMemo(() => {
    const all = daily?.days ?? [];
    if (range === "all") return all;
    const cutoffDays = range === "7d" ? 7 : 30;
    const cutoff = addCalendarDays(todayStr, -(cutoffDays - 1));
    return all.filter((d) => d.day >= cutoff);
  }, [daily, range, todayStr]);

  const stats = useMemo(() => {
    const activeDays = filteredDays.filter((d) => d.count > 0).length;
    const mostActive = filteredDays.reduce<DailyDay | null>(
      (best, d) => (!best || d.count > best.count ? d : best),
      null,
    );
    let totalActions = filteredDays.reduce((sum, d) => sum + d.count, 0);
    let totalInputTokens = filteredDays.reduce(
      (sum, d) => sum + d.inputTokens,
      0,
    );
    let totalOutputTokens = filteredDays.reduce(
      (sum, d) => sum + d.outputTokens,
      0,
    );
    if (range === "all" && usage) {
      // Daily tracking is newer than the monthly counters — for "all time",
      // count this month from whichever source has seen more.
      const monthStart = `${todayStr.slice(0, 7)}-01`;
      const inMonth = filteredDays.filter((d) => d.day >= monthStart);
      const monthActions = inMonth.reduce((s, d) => s + d.count, 0);
      const monthIn = inMonth.reduce((s, d) => s + d.inputTokens, 0);
      const monthOut = inMonth.reduce((s, d) => s + d.outputTokens, 0);
      totalActions += Math.max(0, usage.ai.used - monthActions);
      totalInputTokens += Math.max(0, usage.ai.inputTokens - monthIn);
      totalOutputTokens += Math.max(0, usage.ai.outputTokens - monthOut);
    }
    return {
      totalActions,
      activeDays,
      mostActive,
      totalInputTokens,
      totalOutputTokens,
    };
  }, [filteredDays, range, usage, todayStr]);

  const monthLabels = useMemo(() => {
    return weekStarts.map((weekStart, i) => {
      const thisMonth = formatCalendarDate(weekStart, "MMM");
      if (i === 0) {
        // Skip a partial leading month — its label would collide with the next one
        const third = weekStarts[2];
        return third && formatCalendarDate(third, "MMM") === thisMonth
          ? thisMonth
          : "";
      }
      const prevMonth = formatCalendarDate(weekStarts[i - 1], "MMM");
      return thisMonth !== prevMonth ? thisMonth : "";
    });
  }, [weekStarts]);

  if (usagePending || dailyPending || !usage)
    return <UsageHeatmapSkeleton className={className} />;

  const ai = usage.ai;
  const pct =
    ai.cap > 0 ? Math.min(100, Math.round((ai.used / ai.cap) * 100)) : 0;
  const nearCap = pct >= 90;
  const hasCost =
    ai.inputTokens !== undefined &&
    ai.outputTokens !== undefined &&
    ai.costUsd !== undefined;

  return (
    <div className={className}>
      <div className="surface-card rounded-xl p-4 mb-3">
        <p className="text-sm font-semibold text-foreground mb-3">
          {t("billing.usage.title")}
        </p>

        <UsageRow
          label={t("billing.usage.projects")}
          used={usage.projects.used}
          cap={usage.projects.cap}
        />

        {ai.enabled ? (
          <UsageRow
            label={t("billing.usage.ai")}
            used={ai.used}
            cap={ai.cap}
            warn={nearCap}
          >
            {hasCost && (
              <p className="mt-1 text-2xs text-muted-foreground tabular-nums">
                {t("billing.usage.tokenCost", {
                  inTokens: formatCompactTokens(ai.inputTokens!),
                  outTokens: formatCompactTokens(ai.outputTokens!),
                  cost: ai.costUsd!.toFixed(2),
                })}
              </p>
            )}
          </UsageRow>
        ) : (
          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-muted-foreground">{t("billing.usage.ai")}</span>
            <span className="text-caption">{t("billing.providerNotConfigured")}</span>
          </div>
        )}

        <UsageRow
          label={t("billing.privilege.rows.storage")}
          used={usage.storage.usedBytes}
          cap={usage.storage.capBytes}
          format={formatBytes}
        />

        <UsageRow
          label={t("billing.privilege.rows.docsSent")}
          used={usage.docsSent.used}
          cap={usage.docsSent.cap}
        />

        <UsageRow
          label={t("billing.privilege.rows.slipVerify")}
          used={usage.slipVerify.used}
          cap={usage.slipVerify.cap}
        />

        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-xs text-muted-foreground">
            {t("billing.usage.lastUpdated", {
              time: usage.lastUsedAt
                ? formatTimestampDistance(usage.lastUsedAt, {
                    includeSeconds: true,
                  })
                : t("billing.usage.never"),
            })}
          </span>
          <span aria-hidden className="text-xs text-muted-foreground">
            ·
          </span>
          <span className="text-xs text-muted-foreground">
            {t("billing.usage.resetsOn", {
              date: formatTimestamp(usage.resetAt, "MMM d"),
            })}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={spinning || isFetching}
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-border-subtle transition-colors disabled:opacity-60"
            aria-label={t("billing.usage.refresh")}
          >
            <RotateCw
              size={12}
              className={spinning || isFetching ? "animate-spin" : undefined}
            />
          </button>
        </div>
      </div>

      <div className="surface-card rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-foreground">
            {t("billing.usage.heatmap.title")}
          </p>
          <div className="flex rounded-lg max-w-max overflow-hidden border border-input">
            {(["all", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className="px-2.5 py-1 text-xs transition-colors"
                style={{
                  background:
                    range === r ? "var(--primary-soft)" : "transparent",
                  color: range === r ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                {t(
                  `billing.usage.heatmap.range${r === "all" ? "All" : r === "7d" ? "7d" : "30d"}`,
                )}
              </button>
            ))}
          </div>
        </div>

        {(daily?.days ?? []).length === 0 && ai.used > 0 && (
          <p className="text-2xs text-muted-foreground mb-3">
            {t("billing.usage.heatmap.trackingNew")}
          </p>
        )}

        <div className="relative">
          {scrollFade.left && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[var(--surface-card)] to-transparent"
            />
          )}
          {scrollFade.right && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[var(--surface-card)] to-transparent"
            />
          )}
          <div ref={scrollRef} onScroll={updateScrollFade} className="overflow-x-auto">
          <div className="inline-flex gap-2">
            <div
              className="flex flex-col text-2xs text-muted-foreground shrink-0"
              style={{
                gap: `${GAP_PX}px`,
                paddingTop: `${CELL_PX + GAP_PX + 4}px`,
              }}
            >
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  style={{ height: `${CELL_PX}px` }}
                  className="flex items-center"
                >
                  {ROW_LABEL_DAYS.includes(i)
                    ? formatCalendarDate(days[i], "EEE")
                    : ""}
                </div>
              ))}
            </div>

            <div>
              <div
                className="grid text-2xs text-muted-foreground mb-1"
                style={{
                  gridTemplateColumns: `repeat(${WEEKS}, ${CELL_PX}px)`,
                  gap: `${GAP_PX}px`,
                }}
              >
                {monthLabels.map((label, i) => (
                  <div key={i} className="whitespace-nowrap">
                    {label}
                  </div>
                ))}
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateRows: `repeat(7, ${CELL_PX}px)`,
                  gridAutoFlow: "column",
                  gridAutoColumns: `${CELL_PX}px`,
                  gap: `${GAP_PX}px`,
                }}
              >
                {days.map((day) => {
                  const isFuture = day > todayStr;
                  const entry = dayMap.get(day);
                  const count = entry?.count ?? 0;
                  const level = levelFor(count, maxCount);
                  if (isFuture)
                    return (
                      <div
                        key={day}
                        aria-hidden
                        style={{ width: CELL_PX, height: CELL_PX }}
                      />
                    );
                  return (
                    <Tooltip key={day}>
                      <TooltipTrigger asChild>
                        <div
                          className={`rounded-[3px] ${LEVEL_CLASSES[level]}`}
                          style={{ width: CELL_PX, height: CELL_PX }}
                          title={t(
                            count > 0
                              ? "billing.usage.heatmap.tooltip"
                              : "billing.usage.heatmap.tooltipNone",
                            {
                              count,
                              date: formatCalendarDate(day, "MMM d"),
                            },
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t(
                          count > 0
                            ? "billing.usage.heatmap.tooltip"
                            : "billing.usage.heatmap.tooltipNone",
                          {
                            count,
                            date: formatCalendarDate(day, "MMM d"),
                          },
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 pl-1">
          <span className="text-2xs text-muted-foreground">
            {t("billing.usage.heatmap.less")}
          </span>
          {LEVEL_CLASSES.map((cls, i) => (
            <div
              key={i}
              className={`rounded-[3px] ${cls}`}
              style={{ width: CELL_PX, height: CELL_PX }}
            />
          ))}
          <span className="text-2xs text-muted-foreground">
            {t("billing.usage.heatmap.more")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-3 mt-4 sm:grid-cols-4">
          <Stat
            label={t("billing.usage.heatmap.totalActions")}
            value={stats.totalActions.toLocaleString()}
          />
          <Stat
            label={t("billing.usage.heatmap.activeDays")}
            value={stats.activeDays.toLocaleString()}
          />
          <Stat
            label={t("billing.usage.heatmap.mostActiveDay")}
            value={
              stats.mostActive && stats.mostActive.count > 0
                ? formatCalendarDate(stats.mostActive.day, "MMM d")
                : "—"
            }
          />
          <Stat
            label={t("billing.usage.heatmap.totalTokens")}
            value={`${formatCompactTokens(stats.totalInputTokens)} / ${formatCompactTokens(stats.totalOutputTokens)}`}
          />
        </div>
      </div>
    </div>
  );
}

function UsageRow({
  label,
  used,
  cap,
  warn = false,
  format = (n: number) => n.toLocaleString(),
  children,
}: {
  label: string;
  used: number;
  cap: number | null;
  warn?: boolean;
  format?: (n: number) => string;
  children?: ReactNode;
}) {
  const { t } = useTranslation("settings");
  const pct =
    cap !== null && cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <div className="[&:not(:first-child)]:mt-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold tabular-nums text-foreground">
          {t("billing.usage.count", {
            used: format(used),
            cap: cap === null ? t("billing.usage.unlimited") : format(cap),
          })}
        </p>
      </div>
      {cap !== null && (
        <Progress
          value={pct}
          indicatorClassName={warn ? "bg-warning" : undefined}
        />
      )}
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
