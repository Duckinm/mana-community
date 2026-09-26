import { Check, Info } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PRIVILEGE_MATRIX,
  type PlanId,
  type PrivilegeCell,
  type PrivilegeRow,
} from "@mana/db/plan-entitlements";
import { useTranslation } from "react-i18next";

const PLANS: PlanId[] = ["free", "mana", "aether"];

// ponytail: only slipVerify needs this today — add more row ids here if another
// row grows a "free ≠ paid" nuance worth calling out.
const ROW_TOOLTIPS = new Set(["slipVerify"]);

function cellLabel(
  cell: PrivilegeCell,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  switch (cell.kind) {
    case "count":
      return t("billing.privilege.count", { value: cell.value });
    case "unlimited":
      return t("billing.privilege.unlimited");
    case "text":
      return t(`billing.privilege.cell.${cell.key}`);
    case "locked":
      return t("billing.privilege.locked");
    case "none":
      return t("billing.privilege.none");
  }
}

// soonPlans lets a live row still flag specific paid-only upsell cells
// (e.g. free's "1 calendar" already works; only ">1" is pending).
function isCellSoon(row: PrivilegeRow, plan: PlanId, cell: PrivilegeCell) {
  return row.soonPlans
    ? row.soonPlans.includes(plan)
    : row.status === "soon" && cell.kind !== "locked";
}

function RowLabel({ rowId }: { rowId: string }) {
  const { t } = useTranslation("settings");
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {t(`billing.privilege.rows.${rowId}`)}
      {ROW_TOOLTIPS.has(rowId) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info size={12} className="cursor-default text-caption" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 text-wrap">
            {t(`billing.privilege.rowTooltip.${rowId}`)}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

function CellValue({
  cell,
  soon,
}: {
  cell: PrivilegeCell;
  soon: boolean;
}) {
  const { t } = useTranslation("settings");
  const showCheck =
    cell.kind === "unlimited" || cell.kind === "text" || cell.kind === "count";
  return (
    <span className="inline-flex items-center gap-1">
      {showCheck && <Check size={11} className="shrink-0 text-primary" />}
      <span className={cell.kind === "locked" ? "text-caption" : undefined}>
        {cellLabel(cell, t)}
      </span>
      {soon && (
        <span className="rounded-md border border-border-subtle px-1 py-px text-2xs font-medium text-caption">
          {t("billing.privilege.soon")}
        </span>
      )}
    </span>
  );
}

export function PlanPrivilegeMatrix({ plan = "free" }: { plan?: PlanId }) {
  const { t } = useTranslation("settings");

  // Highest tier already has everything — a comparison table is just noise.
  if (plan === "aether") return null;
  const plans: PlanId[] = plan === "mana" ? ["mana", "aether"] : PLANS;

  return (
    <>
      <div className="surface-card mt-4 hidden overflow-x-auto rounded-xl md:block">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <caption className="sr-only">{t("billing.privilege.caption")}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("billing.privilege.privilege")}
              </th>
              {plans.map((plan) => (
                <th
                  key={plan}
                  className="px-3 py-3 text-sm font-semibold text-foreground"
                >
                  {t(`billing.planNames.${plan}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRIVILEGE_MATRIX.map((row) => (
              <tr key={row.id} className="border-b border-border-subtle last:border-0">
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  <RowLabel rowId={row.id} />
                </th>
                {plans.map((plan) => {
                  const cell = row.cells[plan];
                  const soon = isCellSoon(row, plan, cell);
                  return (
                    <td
                      key={plan}
                      className={`px-3 py-2 text-xs text-foreground ${soon ? "opacity-70" : ""}`}
                    >
                      <CellValue cell={cell} soon={soon} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-border-subtle px-3 py-2 text-2xs text-caption">
          {t("billing.privilege.soonNote")}
        </p>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        <p className="sr-only">{t("billing.privilege.caption")}</p>
        {plans.map((plan) => (
          <section
            key={plan}
            className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
          >
            <h3 className="border-b border-border-subtle px-3 py-2.5 text-sm font-semibold text-foreground">
              {t(`billing.planNames.${plan}`)}
            </h3>
            <ul className="divide-y divide-border-subtle">
              {PRIVILEGE_MATRIX.map((row) => {
                const cell = row.cells[plan];
                const soon = isCellSoon(row, plan, cell);
                return (
                  <li
                    key={row.id}
                    className={`flex items-start justify-between gap-3 px-3 py-2.5 text-xs ${soon ? "opacity-70" : ""}`}
                  >
                    <span className="font-medium text-muted-foreground">
                      <RowLabel rowId={row.id} />
                    </span>
                    <span className="shrink-0 text-foreground">
                      <CellValue cell={cell} soon={soon} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <p className="px-1 text-2xs text-caption">{t("billing.privilege.soonNote")}</p>
      </div>
    </>
  );
}
