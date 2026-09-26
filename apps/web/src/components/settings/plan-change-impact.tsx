import { AlertCircle, Check, Loader2, RotateCcw } from "@/components/icons";
import { PlanChangeImpactSkeleton } from "@/components/settings/plan-change-impact-skeleton";
import { Button } from "@/components/ui/button";
import { client, expectEden } from "@/lib/eden";
import { formatBytes } from "@/lib/format-bytes";
import { queryKeys } from "@/lib/query-keys";
import type { PlanId } from "@mana/db/plan-entitlements";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type ImpactMode = "will" | "now";

export function usePlanChangeImpact(plan: PlanId | null) {
  return useQuery({
    queryKey: ["billing", "plan-change-impact", plan],
    queryFn: async () =>
      expectEden(
        await client.api.billing["plan-change-impact"].get({
          query: { plan: plan as PlanId },
        }),
      ),
    enabled: plan !== null,
  });
}

type Impact = NonNullable<ReturnType<typeof usePlanChangeImpact>["data"]>;

export function impactMessages(
  impact: Impact,
  mode: ImpactMode,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string[] {
  const messages: string[] = [];
  const { projects, ai, docsSent, storage, calendarSync } = impact;

  if (mode === "will" && projects.cap !== null && projects.toArchive > 0) {
    messages.push(
      t("billing.impact.projectsWill", {
        count: projects.toArchive,
        used: projects.used,
        cap: projects.cap,
      }),
    );
  }
  if (mode === "now" && projects.planArchived > 0) {
    messages.push(
      projects.restorable > 0
        ? t("billing.impact.projectsRestorable", { count: projects.restorable })
        : t("billing.impact.projectsNow", { count: projects.planArchived }),
    );
  }
  // "now" uses strict > : counters are blocked at the cap, so exceeding it is
  // only possible via a mid-month downgrade — exactly-at-cap is organic usage.
  const capBinds = (used: number, cap: number) =>
    mode === "will" ? used >= cap : used > cap;
  if (capBinds(ai.used, ai.cap)) {
    messages.push(
      t(`billing.impact.ai${mode === "will" ? "Will" : "Now"}`, {
        used: ai.used,
        cap: ai.cap,
      }),
    );
  }
  if (docsSent.cap !== null && capBinds(docsSent.used, docsSent.cap)) {
    messages.push(
      t(`billing.impact.docsSent${mode === "will" ? "Will" : "Now"}`, {
        used: docsSent.used,
        cap: docsSent.cap,
      }),
    );
  }
  if (storage.capBytes !== null && storage.overBytes > 0) {
    messages.push(
      t(`billing.impact.storage${mode === "will" ? "Will" : "Now"}`, {
        used: formatBytes(storage.usedBytes),
        cap: formatBytes(storage.capBytes),
      }),
    );
  }
  if (calendarSync.connected && !calendarSync.allowed) {
    messages.push(
      t(`billing.impact.calendar${mode === "will" ? "Will" : "Now"}`),
    );
  }
  return messages;
}

export function PlanChangeImpact({
  plan,
  mode,
  className = "",
  allClear = true,
}: {
  plan: PlanId;
  mode: ImpactMode;
  className?: string;
  /** Suppress the green "nothing affected" box — render warnings only. */
  allClear?: boolean;
}) {
  const { t } = useTranslation("settings");
  const queryClient = useQueryClient();
  const impact = usePlanChangeImpact(plan);

  const restoreProjects = useMutation({
    mutationFn: async () =>
      expectEden(await client.api.billing["restore-projects"].post()),
    onSuccess: ({ restored }) => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      toast.success(t("billing.impact.projectsRestored", { count: restored }));
    },
    onError: () => toast.error(t("billing.impact.projectsRestoreError")),
  });

  if (impact.isPending) {
    if (mode === "now" || !allClear) return null;
    return <PlanChangeImpactSkeleton className={className} />;
  }
  if (impact.isError || !impact.data) return null;

  const messages = impactMessages(impact.data, mode, t);

  if (messages.length === 0) {
    if (mode === "now" || !allClear) return null;
    return (
      <div
        className={`flex items-start gap-2 rounded-lg border border-success-border bg-success-soft p-3 ${className}`}
      >
        <Check size={14} className="mt-0.5 shrink-0 text-success" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("billing.impact.nothingAffected", {
            plan: t(`billing.planNames.${plan}`),
          })}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-warning-border bg-warning-soft p-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" />
        <div>
          <p className="text-xs font-semibold text-foreground">
            {t(
              mode === "will"
                ? "billing.impact.willTitle"
                : "billing.impact.nowTitle",
              { plan: t(`billing.planNames.${plan}`) },
            )}
          </p>
          <ul className="mt-1.5 space-y-1">
            {messages.map((message) => (
              <li
                key={message}
                className="text-xs leading-relaxed text-muted-foreground"
              >
                {message}
              </li>
            ))}
          </ul>
          {mode === "now" && impact.data.projects.restorable > 0 && (
            <Button
              variant="warning"
              size="sm"
              className="mt-2.5"
              disabled={restoreProjects.isPending}
              onClick={() => restoreProjects.mutate()}
            >
              {restoreProjects.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              {t("billing.impact.restoreProjects")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
