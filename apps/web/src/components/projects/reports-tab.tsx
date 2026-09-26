import {
  AlertCircle,
  ArrowRight,
  DollarSign,
  FileText,
  TrendingUp,
  Wallet,
} from "@/components/icons";
import { isTaskOverdueByDueField } from "@/components/projects/due-helpers";
import {
  formatProjectMoney,
  summarizeProjectBilling,
} from "@/components/projects/project-billing-helpers";
import { ProjectDocumentPipeline } from "@/components/projects/project-document-pipeline";
import { ProjectReportsChart } from "@/components/projects/project-reports-chart";
import {
  CashflowChartSkeleton,
  DocumentPipelineSkeleton,
  MetricsSkeleton,
} from "@/components/projects/reports-tab-skeleton";
import {
  getTaskStatusFilterConfig,
  TASK_STATUS_BADGE_FG,
  TASK_STATUS_ICON,
} from "@/components/projects/status-styles";
import type { Project, Status } from "@/components/projects/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDocumentsList } from "@/hooks/use-documents";
import { useProjectCashflow } from "@/hooks/use-project-cashflow";
import { panelFadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const EMPTY_ISSUES_SEARCH = {
  statuses: [] as ("todo" | "in-progress" | "done" | "canceled")[],
  priorities: [] as ("high" | "med" | "low")[],
  tags: [] as string[],
  due: null as "overdue" | "today" | "week" | "month" | null,
  created: null as "today" | "week" | "month" | null,
  milestone: null as string | null,
};

function allTasks(p: Project) {
  return p.columns.flatMap((c) => c.tasks);
}

function pctDone(p: Project) {
  const tasks = allTasks(p);
  if (!tasks.length) return 0;
  return Math.round(
    (tasks.filter((t) => t.status === "done").length / tasks.length) * 100,
  );
}

function StatusIconLink({
  status,
  count,
  projectId,
}: {
  status: Status;
  count: number;
  projectId: string;
}) {
  const { t } = useTranslation("projects");
  const Icon = TASK_STATUS_ICON[status];
  const color = TASK_STATUS_BADGE_FG[status];
  const label =
    getTaskStatusFilterConfig(t).find((s) => s.value === status)?.label ??
    status;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/projects/$projectId/issues"
          params={{ projectId }}
          search={{ ...EMPTY_ISSUES_SEARCH, statuses: [status] }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-raised"
          aria-label={`${label} (${count})`}
        >
          <Icon size={14} strokeWidth={2} style={{ color }} />
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color }}
          >
            {count}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function MetricStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  tone: "primary" | "success" | "warning";
}) {
  const toneColor =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
        ? "var(--warning)"
        : "var(--primary)";

  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in srgb, ${toneColor} 14%, transparent)`,
          color: toneColor,
        }}
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground leading-tight">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CollectionProgress({
  billing,
  money,
}: {
  billing: ReturnType<typeof summarizeProjectBilling>;
  money: (cents: number) => string;
}) {
  const { t } = useTranslation("projects");
  const total = billing.collectedCents + billing.outstandingCents;
  if (total <= 0) return null;
  const pct = Math.round((billing.collectedCents / total) * 100);

  return (
    <div className="px-5 py-4 border-t border-border-subtle">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("reports.collectedOf", {
            collected: money(billing.collectedCents),
            total: money(total),
          })}
        </p>
        <p className="text-xs font-semibold tabular-nums text-success">
          {pct}%
        </p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-muted border border-border">
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReportsTab({ project }: { project: Project }) {
  const { t } = useTranslation("projects");
  const { data, isPending } = useDocumentsList({
    projectId: project.id,
    limit: 100,
  });
  const docs = data?.data ?? [];
  const { data: chartData = [], isPending: isChartPending } =
    useProjectCashflow(project.id);

  const tasks = allTasks(project);
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const overdue = tasks.filter((t) =>
    isTaskOverdueByDueField(t.due, t.status),
  ).length;
  const pct = pctDone(project);

  const billing = summarizeProjectBilling(docs);
  const money = (cents: number) => formatProjectMoney(cents, billing.currency);

  return (
    <motion.div key="reports" {...panelFadeUp} className="space-y-4">
      {isPending ? (
        <MetricsSkeleton />
      ) : (
        <div className="list-shell">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
            <MetricStat
              label={t("reports.collected")}
              value={money(billing.collectedCents)}
              icon={Wallet}
              tone="success"
            />
            <MetricStat
              label={t("reports.invoiced")}
              value={money(billing.invoicedCents)}
              icon={FileText}
              tone="primary"
            />
            <MetricStat
              label={t("reports.quoted")}
              value={money(billing.quotedCents)}
              icon={TrendingUp}
              tone="primary"
            />
            <MetricStat
              label={t("reports.outstanding")}
              value={money(billing.outstandingCents)}
              icon={DollarSign}
              tone={billing.outstandingCents > 0 ? "warning" : "success"}
            />
          </div>
          <CollectionProgress billing={billing} money={money} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,15rem)_1fr] gap-4">
        <div className="surface-card rounded-xl p-5 flex flex-col gap-3 h-full">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("reports.taskProgress")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("reports.issueBreakdown")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(${project.color} ${pct * 3.6}deg, var(--muted) 0deg)`,
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {pct}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("reports.tasksComplete", { done, total: tasks.length })}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Link
              to="/projects/$projectId/issues"
              params={{ projectId: project.id }}
              search={{ ...EMPTY_ISSUES_SEARCH, statuses: ["in-progress"] }}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-raised"
            >
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp
                  size={13}
                  className="text-warning"
                  strokeWidth={2}
                />
                {t("reports.inProgress")}
              </span>
              <span className="text-xs font-semibold tabular-nums text-warning">
                {inProgress}
              </span>
            </Link>
            <Link
              to="/projects/$projectId/issues"
              params={{ projectId: project.id }}
              search={{ ...EMPTY_ISSUES_SEARCH, due: "overdue" }}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-raised"
            >
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle
                  size={13}
                  className={
                    overdue > 0 ? "text-danger" : "text-muted-foreground"
                  }
                  strokeWidth={2}
                />
                {t("reports.overdue")}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  overdue > 0 ? "text-danger" : "text-muted-foreground",
                )}
              >
                {overdue}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-auto">
            {project.columns
              .filter((col) => col.id === "todo" || col.id === "canceled")
              .map((col) => (
                <StatusIconLink
                  key={col.id}
                  status={col.id as Status}
                  count={col.tasks.length}
                  projectId={project.id}
                />
              ))}
          </div>
        </div>

        {isPending ? (
          <DocumentPipelineSkeleton />
        ) : (
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("reports.documentPipeline")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("reports.pipelineSubtitle")}
                </p>
              </div>
              <Link
                to="/documents"
                search={{ projectId: project.id }}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("reports.viewAll")}
                <ArrowRight size={13} strokeWidth={2} />
              </Link>
            </div>
            <ProjectDocumentPipeline docs={docs} projectId={project.id} />
          </div>
        )}
      </div>

      {isChartPending ? (
        <CashflowChartSkeleton />
      ) : (
        <div className="surface-card rounded-xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("reports.cashflowProjection")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("reports.cashflowSubtitle")}
              </p>
            </div>
            <p className="text-2xs text-caption">
              {t("reports.purchaseCurveNote")}
            </p>
          </div>
          <ProjectReportsChart data={chartData} />
        </div>
      )}
    </motion.div>
  );
}
