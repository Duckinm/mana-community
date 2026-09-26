import {
  ACTIVITY_FILTER_OPTIONS,
  activityEntityLink,
  formatActivityDetail,
  translateSummary,
  type ActivityEntityType,
  type ActivityListResponse,
  type ActivityLog,
} from "@/components/activity/activity-helpers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { formatTimestamp, formatTimestampDistance } from "@/lib/timestamp";
import { cn } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 5;

function TimelineSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 border-t border-border-subtle py-2.5"
        >
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="ml-auto h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function ActivityEntry({ log }: { log: ActivityLog }) {
  const { t } = useTranslation("activity");
  const relativeTime = formatTimestampDistance(log.createdAt);
  const summary = translateSummary(t, log);
  const detail = formatActivityDetail(t, log.metadata);
  const link = activityEntityLink(log);
  const content = (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 border-t border-border-subtle py-2.5 text-xs">
      <span
        data-testid="activity-time"
        className="truncate text-2xs text-caption"
      >
        {relativeTime}
      </span>
      <p className="truncate text-muted-foreground">
        <span className="text-foreground">{summary}</span>
        {detail && <span> · {detail}</span>}
      </p>
      <span className="truncate text-right text-2xs capitalize text-caption">
        {log.entityType}
      </span>
    </div>
  );

  return link ? (
    <Link
      to={link.to}
      params={link.params}
      title={formatTimestamp(log.createdAt)}
      className="block transition-colors duration-base hover:bg-surface-raised/60"
    >
      {content}
    </Link>
  ) : (
    <div title={formatTimestamp(log.createdAt)}>{content}</div>
  );
}

export function ContactTimeline({
  contactId,
  className,
}: {
  contactId: string;
  className?: string;
}) {
  const { t } = useTranslation("contacts");
  const [entityFilter, setEntityFilter] = useState<ActivityEntityType>("all");
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.contactActivity(contactId, {
        entityType: entityFilter,
      }),
      queryFn: async ({ pageParam = 0 }): Promise<ActivityListResponse> => {
        const res = await client.api.activity.contact({ contactId }).get({
          query: {
            limit: PAGE_SIZE,
            offset: pageParam,
            entityType: entityFilter !== "all" ? entityFilter : undefined,
          },
        });
        if (res.error || !res.data) {
          return {
            data: [],
            total: 0,
            limit: PAGE_SIZE,
            offset: pageParam,
            hasMore: false,
          };
        }
        return res.data;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    });

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const allLogs = data?.pages.flatMap((page) => page.data) ?? [];
  const logs = allLogs.filter(
    (log) => new Date(log.createdAt).getTime() >= cutoff,
  );
  const canLoadMore =
    hasNextPage &&
    (allLogs.length === 0 ||
      new Date(allLogs[allLogs.length - 1].createdAt).getTime() >= cutoff);

  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">
            {t("timeline.activity")}
          </h2>
          <span className="text-2xs text-caption">
            {t("timeline.eventCount", { count: logs.length })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ACTIVITY_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={entityFilter === option.value}
              onClick={() => setEntityFilter(option.value)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors duration-base ${entityFilter === option.value ? "border-border-default bg-surface-raised text-foreground" : "border-border-subtle text-muted-foreground hover:text-foreground"}`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div data-testid="activity-results" className="[overflow-anchor:none]">
        {isLoading ? (
          <TimelineSkeleton />
        ) : logs.length === 0 ? (
          <p className="border-t border-border-subtle py-6 text-center text-xs text-caption">
            {t("timeline.noActivity")}
          </p>
        ) : (
          logs.map((log) => <ActivityEntry key={log.id} log={log} />)
        )}
      </div>

      {canLoadMore && (
        <div
          data-testid="activity-load-more"
          className="flex justify-center border-t border-border-subtle p-3"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? t("timeline.loading") : t("timeline.loadMore")}
          </Button>
        </div>
      )}
    </section>
  );
}
