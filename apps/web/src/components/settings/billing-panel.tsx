import {
  AlertCircle,
  Check,
  Clock,
  Eye,
  Gift,
  Loader2,
  RotateCcw,
} from "@/components/icons";
import { Row } from "@/components/settings/shared";
import { BillingPanelSkeleton } from "@/components/settings/billing-panel-skeleton";
import {
  formatPlanChangeAmount,
  paidPlanFeatures,
  planCardClass,
} from "@/components/settings/billing-helpers";
import { PlanChangeImpact } from "@/components/settings/plan-change-impact";
import { PlanPrivilegeMatrix } from "@/components/settings/plan-privilege-matrix";
import { UsageHeatmap } from "@/components/settings/usage-heatmap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTION_CAPS,
  PROJECT_CAPS,
  type PaidPlanId,
  type PlanId,
} from "@mana/db/plan-entitlements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/context/settings";
import { isApiError } from "@/lib/api-error";
import { formatMonthYear } from "@/lib/calendar-date";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { randomId } from "@/lib/random-id";
import { formatTimestamp } from "@/lib/timestamp";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type PaidPlan = PaidPlanId;
type Interval = "monthly" | "annual";

const PLANS: PaidPlan[] = ["mana", "aether"];
const INTERVAL_TABS: Interval[] = ["monthly", "annual"];
const PLAN_RANK: Record<PlanId, number> = { free: 0, mana: 1, aether: 2 };

export function BillingPanel() {
  const { user, loading } = useSettings();
  const { t } = useTranslation("settings");
  if (loading) return <BillingPanelSkeleton />;
  if (user?.deploymentMode === "self-hosted") {
    return (
      <div>
        <div className="surface-card mb-3 rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground">{t("billing.selfHostedTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("billing.selfHostedDescription")}</p>
        </div>
        <UsageHeatmap />
      </div>
    );
  }
  return <CloudBillingPanel />;
}

function CloudBillingPanel() {
  const { t, i18n } = useTranslation("settings");
  const { user } = useSettings();
  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [adjustPlan, setAdjustPlan] = useState<PaidPlan>("mana");
  const [adjustInterval, setAdjustInterval] = useState<Interval>("monthly");
  const [changeKey, setChangeKey] = useState(() => randomId());
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const [invoiceMonth, setInvoiceMonth] = useState(currentMonthKey);

  const overview = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: async () => expectEden(await client.api.billing.overview.get()),
    retry: false,
  });
  const subscription = overview.data?.subscription;
  const currentPlan = subscription
    ? subscription.plan
    : user?.plan === "mana" || user?.plan === "aether"
      ? user.plan
      : null;
  const hasSubscription = Boolean(subscription);
  const isFree = !hasSubscription;
  const currentInterval: Interval =
    subscription?.interval === "annual" || user?.billingInterval === "annual"
      ? "annual"
      : "monthly";
  const pendingChange = subscription?.pendingChange;
  const effectivePlan: PlanId =
    subscription?.plan ?? (user?.plan as PlanId | undefined) ?? "free";
  const paymentNeedsAction = Boolean(
    subscription &&
      (subscription.paymentPending ||
        !["active", "trialing"].includes(subscription.status)),
  );
  const accessPaused = Boolean(
    subscription &&
      ["incomplete", "unpaid", "paused"].includes(subscription.status),
  );

  function priceFor(plan: PaidPlan, interval: Interval) {
    return overview.data?.prices.find(
      (price) => price.plan === plan && price.interval === interval,
    );
  }

  function formattedPrice(plan: PaidPlan, interval: Interval): string {
    const price = priceFor(plan, interval);
    return price
      ? formatPlanChangeAmount(price.amount, price.currency, i18n.language)
      : "—";
  }

  function fullAnnualPrice(plan: PaidPlan): string {
    const monthly = priceFor(plan, "monthly");
    return monthly
      ? formatPlanChangeAmount(monthly.amount * 12, monthly.currency, i18n.language)
      : "—";
  }

  const checkout = useMutation({
    mutationFn: async ({
      plan,
      interval,
    }: {
      plan: PaidPlan;
      interval: Interval;
    }) =>
      expectEden(
        await client.api.billing["checkout-session"].post({
          plan,
          interval,
          idempotencyKey: randomId(),
        }),
      ),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 501) return;
      toast.error(t("billing.checkoutError"));
    },
  });

  const portal = useMutation({
    mutationFn: async (flow?: "cancel") =>
      expectEden(
        await client.api.billing["portal-session"].post(flow ? { flow } : {}),
      ),
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      toast.error(t("billing.manageBillingError"));
    },
  });

  const restore = useMutation({
    mutationFn: async () =>
      expectEden(await client.api.billing.restore.post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "overview"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      toast.success(t("billing.changeRestored"));
    },
    onError: () => toast.error(t("billing.changeRestoreError")),
  });

  const isCurrentSelection =
    hasSubscription &&
    currentPlan === adjustPlan &&
    currentInterval === adjustInterval;
  const isPendingSelection =
    pendingChange?.plan === adjustPlan &&
    pendingChange.interval === adjustInterval;

  const previewPlanChange = useQuery({
    queryKey: ["billing", "preview-plan-change", adjustPlan, adjustInterval],
    queryFn: async () =>
      expectEden(
        await client.api.billing["preview-plan-change"].post({
          plan: adjustPlan,
          interval: adjustInterval,
        }),
      ),
    enabled: adjustOpen && !isFree && !isCurrentSelection && !isPendingSelection,
    staleTime: 30_000,
    retry: false,
  });

  const changePlan = useMutation({
    mutationFn: async ({
      plan,
      interval,
    }: {
      plan: PaidPlan;
      interval: Interval;
    }) =>
      expectEden(
        await client.api.billing["change-plan"].post({
          plan,
          interval,
          idempotencyKey: changeKey,
          ...(previewPlanChange.data?.prorationDate
            ? { prorationDate: previewPlanChange.data.prorationDate }
            : {}),
        }),
      ),
    onSuccess: ({ effectiveAt, status, paymentUrl }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: ["billing", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
      if (status === "payment_required") {
        if (paymentUrl) window.location.href = paymentUrl;
        else
          toast.error(t("billing.paymentRequired"), {
            action: {
              label: t("billing.resolvePayment"),
              onClick: () => portal.mutate(undefined),
            },
          });
      } else if (effectiveAt) {
        toast.success(
          t("billing.changePlanScheduled", {
            plan: t(`billing.planNames.${adjustPlan}`),
            date: formatTimestamp(effectiveAt, "MMM d, yyyy"),
          }),
        );
      } else {
        toast.success(t("billing.changePlanApplied"));
      }
      setAdjustOpen(false);
    },
    onError: () => {
      toast.error(t("billing.changePlanError"));
    },
  });

  const invoices = useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: async () => expectEden(await client.api.billing.invoices.get()),
    enabled: hasSubscription,
  });

  const notConfigured =
    (isApiError(overview.error) && overview.error.status === 501) ||
    (isApiError(checkout.error) && checkout.error.status === 501);

  useEffect(() => {
    if (!adjustOpen || isFree || isCurrentSelection || isPendingSelection)
      return;
    // A fresh key per plan/interval selection — Stripe rejects reusing an
    // idempotency key with different request parameters, so switching the
    // selection inside an open dialog needs a new one, not just opening it.
    setChangeKey(randomId());
  }, [adjustOpen, isFree, isCurrentSelection, isPendingSelection, adjustPlan, adjustInterval]);

  function openAdjustDialog(plan: PaidPlan, interval: Interval) {
    setAdjustPlan(plan);
    setAdjustInterval(interval);
    setAdjustOpen(true);
  }

  function closeAdjustDialog() {
    setAdjustOpen(false);
  }

  function confirmPlanChange() {
    changePlan.mutate({ plan: adjustPlan, interval: adjustInterval });
  }

  const invoiceMonths = useMemo(() => {
    const months = new Set([currentMonthKey]);
    for (const invoice of invoices.data ?? [])
      months.add(format(new Date(invoice.date), "yyyy-MM"));
    return Array.from(months).sort().reverse();
  }, [invoices.data, currentMonthKey]);

  const visibleInvoices = (invoices.data ?? []).filter(
    (invoice) => format(new Date(invoice.date), "yyyy-MM") === invoiceMonth,
  );

  if (overview.isPending) return <BillingPanelSkeleton />;

  if (overview.isError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-soft p-3">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(notConfigured ? "billing.notConfigured" : "billing.overviewError")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {pendingChange && currentPlan && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-primary-border bg-primary-soft p-3">
          <div className="flex min-w-0 gap-2.5">
            <Clock size={15} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("billing.pendingChangeTitle", {
                  plan: t(`billing.planNames.${pendingChange.plan}`),
                })}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t("billing.pendingChangeDescription", {
                  currentPlan: t(`billing.planNames.${currentPlan}`),
                  newPlan: t(`billing.planNames.${pendingChange.plan}`),
                  interval: t(`billing.intervalLabels.${pendingChange.interval}`),
                  date: formatTimestamp(pendingChange.effectiveAt, "MMM d, yyyy"),
                })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={restore.isPending || portal.isPending}
            onClick={() =>
              pendingChange.manageable
                ? restore.mutate()
                : portal.mutate(undefined)
            }
          >
            {(restore.isPending || portal.isPending) && (
              <Loader2 size={12} className="animate-spin" />
            )}
            {pendingChange.manageable && <RotateCcw size={12} />}
            {pendingChange.manageable
              ? t("billing.keepCurrentPlan")
              : t("billing.manageInStripe")}
          </Button>
        </div>
      )}

      {pendingChange &&
        currentPlan &&
        PLAN_RANK[pendingChange.plan] < PLAN_RANK[currentPlan] && (
          <PlanChangeImpact
            plan={pendingChange.plan}
            mode="will"
            allClear={false}
            className="mb-3"
          />
        )}

      {subscription?.cancelAtPeriodEnd && (
        <PlanChangeImpact
          plan="free"
          mode="will"
          allClear={false}
          className="mb-3"
        />
      )}

      <UsageHeatmap className="mb-3" />

      <PlanChangeImpact plan={effectivePlan} mode="now" className="mb-3" />

      {isFree && (
        <div className="rounded-xl p-4 mb-3 bg-accent border border-primary-border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-primary">
              {t("billing.planNames.free")}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={overview.isError}
              onClick={() => openAdjustDialog("mana", "monthly")}
            >
              {t("billing.upgradePlan")}
            </Button>
          </div>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {t("billing.planDetailFree")}
          </p>
          <ul className="mt-3 space-y-1.5">
            {(
              [
                t("billing.privilege.feature.projects", {
                  count: PROJECT_CAPS.free,
                }),
                t("billing.privilege.feature.ai", {
                  count: ACTION_CAPS.free,
                }),
                t("billing.privilege.feature.coreTools"),
              ] as string[]
            ).map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Check size={12} className="text-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {paymentNeedsAction && subscription && (
        <div
          className={`mb-3 flex items-start justify-between gap-3 rounded-xl border p-3 ${
            accessPaused
              ? "border-danger/20 bg-danger-soft"
              : "border-warning-border bg-warning-soft"
          }`}
        >
          <div className="flex min-w-0 gap-2.5">
            <AlertCircle
              size={15}
              className={`mt-0.5 shrink-0 ${accessPaused ? "text-danger" : "text-warning"}`}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t(
                  subscription.paymentPending
                    ? "billing.paymentPendingTitle"
                    : accessPaused
                      ? "billing.accessPausedTitle"
                      : "billing.paymentRetryTitle",
                )}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t(
                  subscription.paymentPending
                    ? "billing.paymentPendingDescription"
                    : accessPaused
                      ? "billing.accessPausedDescription"
                      : "billing.paymentRetryDescription",
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={portal.isPending}
            onClick={() => {
              if (subscription.paymentUrl) window.location.href = subscription.paymentUrl;
              else portal.mutate(undefined);
            }}
          >
            {portal.isPending && <Loader2 size={12} className="animate-spin" />}
            {t("billing.resolvePayment")}
          </Button>
        </div>
      )}

      {!isFree && currentPlan && currentInterval === "monthly" && !pendingChange && (
        <div className="rounded-lg px-3 py-2.5 mb-3 flex items-center justify-between gap-3 bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-primary shrink-0" />
            <p className="text-xs text-primary">{t("billing.annualUpsell")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAdjustDialog(currentPlan, "annual")}
          >
            {t("billing.annualUpsellCta")}
          </Button>
        </div>
      )}

      <div className="mb-3">
        {notConfigured && (
          <div className="rounded-lg p-3 mb-3 flex items-start gap-2 bg-warning/10 border border-warning/30">
            <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {t("billing.notConfigured")}
            </p>
          </div>
        )}

        {isFree ? null : currentPlan ? (
          <div className="surface-card rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t(`billing.planNames.${currentPlan}`)}{" "}
                <span className="font-normal text-muted-foreground">
                  {currentInterval === "monthly"
                    ? t("billing.priceMonthly", {
                        price: formattedPrice(currentPlan, "monthly"),
                      })
                    : t("billing.priceAnnual", {
                        price: formattedPrice(currentPlan, "annual"),
                      })}
                </span>
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                {subscription?.cancelAtPeriodEnd
                  ? t("billing.cancelPlanScheduled", {
                      date: formatTimestamp(
                        subscription.currentPeriodEnd,
                        "MMM d, yyyy",
                      ),
                    })
                  : t("billing.autoRenewOn", {
                      date: formatTimestamp(
                        subscription?.currentPeriodEnd,
                        "MMM d, yyyy",
                      ),
                    })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openAdjustDialog(currentPlan, currentInterval)
              }
              disabled={subscription?.cancelAtPeriodEnd}
            >
              {t("billing.adjustPlan")}
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-soft p-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("billing.unrecognizedPlan")}
            </p>
          </div>
        )}
      </div>

      <PlanPrivilegeMatrix plan={effectivePlan} />

      {!isFree && (
        <div className="mt-3">
          <Row label={t("billing.payment")} sub={t("billing.paymentSub")}>
            <Button
              variant="outline"
              size="sm"
              disabled={portal.isPending}
              onClick={() => portal.mutate(undefined)}
            >
              {portal.isPending && (
                <Loader2 size={12} className="animate-spin" />
              )}
              {t("billing.manageInStripe")}
            </Button>
          </Row>

          <div className="py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-subtle">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-foreground">
                {t("billing.invoicesTitle")}
              </p>
              {invoiceMonths.length > 1 && (
                <Select value={invoiceMonth} onValueChange={setInvoiceMonth}>
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonthYear(
                          new Date(`${month}-01T00:00:00`),
                          i18n.language,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {visibleInvoices.length > 0 ? (
              <div className="mt-2 divide-y divide-border-subtle">
                {visibleInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2 text-sm sm:grid-cols-4 sm:gap-2 sm:py-1.5"
                  >
                    <span className="truncate text-foreground">
                      {formatTimestamp(invoice.date, "MMM d, yyyy")}
                    </span>
                    <span className="row-start-2 text-xs text-muted-foreground sm:row-auto">
                      {invoice.status}
                    </span>
                    <span className="row-start-2 text-right font-mono text-xs tabular-nums text-muted-foreground sm:row-auto">
                      {formatPlanChangeAmount(
                        invoice.total,
                        invoice.currency,
                        i18n.language,
                      )}
                    </span>
                    <span className="col-start-2 row-start-1 text-right sm:col-auto sm:row-auto">
                      {invoice.hostedInvoiceUrl && (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
                        >
                          <Eye size={12} />
                          {t("billing.viewInvoice")}
                        </a>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs mt-2 text-muted-foreground">
                {t("billing.invoicesEmpty")}
              </p>
            )}
          </div>

          <Row label={t("billing.cancellationTitle")}>
            <Button
              variant="outline"
              size="sm"
              disabled={portal.isPending || restore.isPending}
              onClick={() =>
                subscription?.cancelAtPeriodEnd
                  ? restore.mutate()
                  : setCancelOpen(true)
              }
            >
              {(portal.isPending || restore.isPending) && (
                <Loader2 size={12} className="animate-spin" />
              )}
              {subscription?.cancelAtPeriodEnd
                ? t("billing.resumePlan")
                : t("billing.cancelPlan")}
            </Button>
          </Row>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold">
              {t("billing.cancelDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("billing.cancelDialogDescription", {
              date: formatTimestamp(
                subscription?.currentPeriodEnd,
                "MMM d, yyyy",
              ),
            })}
          </p>
          <PlanChangeImpact plan="free" mode="will" />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(false)}
            >
              {t("billing.keepCurrentPlan")}
            </Button>
            <Button
              variant="solid"
              size="sm"
              disabled={portal.isPending}
              onClick={() => {
                setCancelOpen(false);
                portal.mutate("cancel");
              }}
            >
              {portal.isPending && (
                <Loader2 size={12} className="animate-spin" />
              )}
              {t("billing.cancelDialogConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={adjustOpen}
        onOpenChange={(open) => !open && closeAdjustDialog()}
      >
        <DialogContent className="flex h-[min(85vh,680px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
            <DialogTitle className="font-semibold">
              {t(
                isFree
                  ? "billing.choosePlanDialogTitle"
                  : "billing.changePlanDialogTitle",
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="grid w-full grid-cols-2 gap-1.5 rounded-xl bg-muted p-1 sm:w-fit">
              {INTERVAL_TABS.map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setAdjustInterval(interval)}
                  className="min-w-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background:
                      adjustInterval === interval ? "var(--card)" : "transparent",
                    color:
                      adjustInterval === interval
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    boxShadow:
                      adjustInterval === interval ? "var(--shadow-card)" : "none",
                  }}
                >
                  {t(`billing.intervalLabels.${interval}`)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setAdjustPlan(plan)}
                  className={planCardClass(plan, plan === adjustPlan)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {t(`billing.planNames.${plan}`)}
                    </p>
                    {!isFree && plan === currentPlan && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {t("billing.currentPlanBadge")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {t(`billing.planPitches.${plan}`)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {adjustInterval === "monthly" ? (
                      <span className="text-xs text-muted-foreground">
                        {t("billing.priceMonthly", {
                          price: formattedPrice(plan, "monthly"),
                        })}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground line-through">
                          {fullAnnualPrice(plan)}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {t("billing.priceAnnual", {
                            price: formattedPrice(plan, "annual"),
                          })}
                        </span>
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {t("billing.twoMonthsFree")}
                        </span>
                      </>
                    )}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {paidPlanFeatures(plan, t).map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <Check size={12} className="text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {isFree ? null : isCurrentSelection ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {t("billing.alreadyOnPlan")}
              </p>
            ) : isPendingSelection ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {t("billing.alreadyScheduled")}
              </p>
            ) : previewPlanChange.isError ? (
              <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft p-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-danger" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("billing.changePlanError")}
                </p>
              </div>
            ) : previewPlanChange.isPending || !previewPlanChange.data ? (
              <div className="space-y-3">
                <div className="divide-y divide-border-subtle border-y border-border-subtle">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5"
                    >
                      <Skeleton className="h-3 w-32 rounded-sm" />
                      <Skeleton className="h-3 w-14 rounded-sm" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full rounded-sm" />
                  <Skeleton className="h-3.5 w-full rounded-sm" />
                  <Skeleton className="h-4 w-full rounded-sm" />
                </div>
              </div>
            ) : previewPlanChange.data.mode === "scheduled" &&
              previewPlanChange.data.effectiveAt &&
              previewPlanChange.data.nextAmount !== null ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("billing.scheduledChangeStartsOn", {
                    currentPlan: t(`billing.planNames.${currentPlan}`),
                    newPlan: t(`billing.planNames.${adjustPlan}`),
                    date: formatTimestamp(
                      previewPlanChange.data.effectiveAt,
                      "MMM d, yyyy",
                    ),
                  })}
                </p>
                <div className="divide-y divide-border-subtle border-y border-border-subtle text-sm">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">
                      {t("billing.nextRenewal")}
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatPlanChangeAmount(
                        previewPlanChange.data.nextAmount,
                        previewPlanChange.data.currency,
                        i18n.language,
                      )}
                    </span>
                  </div>
                  {previewPlanChange.data.total !==
                    previewPlanChange.data.nextAmount && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">
                        {t("billing.estimatedRenewalTotal")}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">
                        {formatPlanChangeAmount(
                          previewPlanChange.data.total,
                          previewPlanChange.data.currency,
                          i18n.language,
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 font-semibold">
                    <span className="text-foreground">
                      {t("billing.totalDueToday")}
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatPlanChangeAmount(
                        0,
                        previewPlanChange.data.currency,
                        i18n.language,
                      )}
                    </span>
                  </div>
                </div>
                {currentPlan &&
                  PLAN_RANK[adjustPlan] < PLAN_RANK[currentPlan] && (
                    <PlanChangeImpact plan={adjustPlan} mode="will" />
                  )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-border-subtle border-y border-border-subtle">
                  {previewPlanChange.data.lines.map((line) => (
                    <div
                      key={line.description}
                      className="flex items-center justify-between py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {line.description}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">
                        {formatPlanChangeAmount(
                          line.amount,
                          previewPlanChange.data.currency,
                          i18n.language,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("billing.subtotal")}
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatPlanChangeAmount(
                        previewPlanChange.data.subtotal,
                        previewPlanChange.data.currency,
                        i18n.language,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("billing.tax")}
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatPlanChangeAmount(
                        previewPlanChange.data.tax,
                        previewPlanChange.data.currency,
                        i18n.language,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-foreground">
                      {t("billing.totalDueToday")}
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatPlanChangeAmount(
                        previewPlanChange.data.total,
                        previewPlanChange.data.currency,
                        i18n.language,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="drawer-footer">
            <Button
              variant="outline"
              size="sm"
              onClick={closeAdjustDialog}
              disabled={changePlan.isPending}
            >
              {t("billing.changePlanCancel")}
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={() =>
                isFree
                  ? checkout.mutate({ plan: adjustPlan, interval: adjustInterval })
                  : confirmPlanChange()
              }
              disabled={
                isFree
                  ? checkout.isPending || overview.isError
                  : changePlan.isPending ||
                    isCurrentSelection ||
                    isPendingSelection ||
                    !previewPlanChange.data
              }
            >
              {(isFree ? checkout.isPending : changePlan.isPending) && (
                <Loader2 size={12} className="animate-spin" />
              )}
              {isFree
                ? t("billing.continueToCheckout")
                : previewPlanChange.data?.mode === "scheduled"
                  ? t("billing.scheduleChangeConfirm")
                  : t("billing.changeNowConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
