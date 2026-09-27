import { formatCurrency } from "@/components/documents/utils";
import { ProjectLinkBadge } from "@/components/projects/project-badge";
import { Loader2, RotateCw, Users } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/context/projects";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { formatTimestampRelative } from "@/lib/timestamp";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function BriefingMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5 text-xs", className)}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </span>
  );
}

export function ContactBriefingCard({
  contactId,
  className,
}: {
  contactId: string;
  className?: string;
}) {
  const { t } = useTranslation("contacts");
  const { projects } = useProjects();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: queryKeys.contactBriefing(contactId),
    queryFn: async () =>
      expectEden(await client.api.contacts({ id: contactId }).briefing.get()),
    retry: false,
  });

  const regenerate = useMutation({
    mutationFn: async () =>
      expectEden(
        await client.api.contacts({ id: contactId }).briefing.regenerate.post(),
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.contactBriefing(contactId), result);
    },
  });

  const briefing = data?.briefing ?? null;
  const checkedAt = data?.checkedAt ?? null;
  const busy = isLoading || regenerate.isPending;
  const loadFailed = isError && !data;
  const recommendation = briefing
    ? briefing.daysSinceLastContact !== null &&
      briefing.daysSinceLastContact > 60
      ? t("briefing.recommendation.checkIn", {
          count: briefing.daysSinceLastContact,
        })
      : briefing.openInvoiceCount > 0
        ? t("briefing.recommendation.openInvoices", {
            count: briefing.openInvoiceCount,
          })
        : briefing.projects.length === 0
          ? t("briefing.recommendation.opportunity")
          : t("briefing.recommendation.goodStanding")
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary-border bg-primary-soft/45 px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Users size={15} className="text-primary" />
            <span className="text-sm font-medium text-primary">
              {t("briefing.title")}
            </span>
          </div>
          {briefing && (
            <p className="mt-1 text-xs text-caption">
              {t("briefing.checked", {
                relative: checkedAt ? formatTimestampRelative(checkedAt) : "—",
              })}
            </p>
          )}
        </div>

        {briefing && !regenerate.isError && (
          <button
            type="button"
            onClick={() => regenerate.mutate()}
            disabled={busy}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm text-primary/80 transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-50"
          >
            <RotateCw
              size={13}
              className={regenerate.isPending ? "animate-spin" : undefined}
            />
            {t("briefing.regenerate")}
          </button>
        )}
      </div>

      {loadFailed && (
        <div
          role="alert"
          data-testid="briefing-load-failed"
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <span>{t("briefing.loadFailed")}</span>
          <button
            type="button"
            aria-label={t("briefing.retry")}
            title={t("briefing.retry")}
            disabled={isFetching}
            onClick={() => void refetch()}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-primary/80 transition-colors duration-base hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <RotateCw
              size={13}
              className={isFetching ? "animate-spin" : undefined}
            />
          </button>
        </div>
      )}

      {busy && !briefing && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-primary/80">
          <Loader2 size={12} className="animate-spin" />
          {regenerate.isPending
            ? t("briefing.refreshing")
            : t("briefing.loading")}
        </div>
      )}

      {regenerate.isError && (
        <p className="mt-2 text-sm text-danger">{t("briefing.failed")}</p>
      )}

      {!busy && !briefing && !regenerate.isError && !loadFailed && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-primary/80">{t("briefing.empty")}</p>
          <Button type="button" size="sm" onClick={() => regenerate.mutate()}>
            <Users size={13} aria-hidden="true" />
            {t("briefing.generate")}
          </Button>
        </div>
      )}

      {briefing && (
        <div className="mt-4 space-y-3.5">
          <p
            data-testid="briefing-recommendation"
            className="max-w-[70ch] text-pretty text-lg font-medium leading-snug tracking-[-0.015em] text-foreground"
          >
            {recommendation}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-primary-border/60 pt-3">
            <BriefingMetric
              label={t("briefing.stage")}
              value={briefing.contact.stage ?? "—"}
              className="capitalize"
            />
            <BriefingMetric
              label={t("briefing.last")}
              value={
                briefing.daysSinceLastContact !== null
                  ? t("briefing.daysAgo", {
                      count: briefing.daysSinceLastContact,
                    })
                  : t("briefing.never")
              }
            />
            <BriefingMetric
              label={t("briefing.billed")}
              value={formatCurrency(briefing.totalRevenueCents)}
              className="[&_span:last-child]:font-mono [&_span:last-child]:tabular-nums"
            />
            <BriefingMetric
              label={t("briefing.open")}
              value={String(briefing.openInvoiceCount)}
            />
          </div>

          {briefing.projects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {briefing.projects.map((project) => {
                const fullProject = projects.find(
                  (item) => item.id === project.id,
                );
                return (
                  <ProjectLinkBadge
                    key={project.id}
                    project={{
                      ...project,
                      color: fullProject?.color ?? "var(--primary)",
                      icon: fullProject?.icon,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
