import { aiFlagKey } from "@/components/finance/ai-flag-labels";
import { TransactionCategoryGrid } from "@/components/finance/transaction-category-grid";
import { TransactionInvoicePicker } from "@/components/finance/transaction-invoice-picker";
import {
  currencySymbol,
  formatSignedAmount,
  statusesFor,
  transactionSchema,
} from "@/components/finance/transaction-modal-helpers";
import { TransactionTypeCards } from "@/components/finance/transaction-type-cards";
import { TransactionWalletChips } from "@/components/finance/transaction-wallet-chips";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
  Wallet,
} from "@/components/finance/types";
import { Trash2 } from "@/components/icons";
import { AiBadge } from "@/components/ui/ai-badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjects } from "@/context/projects";
import { CURRENCIES, useCurrency } from "@/hooks/use-currency";
import { useDocuments } from "@/hooks/use-documents";
import {
  normalizeCalendarDateField,
  todayCalendarDate,
} from "@/lib/calendar-date";
import { mergeCategoryLists } from "@/lib/merge-category-lists";
import { fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface TransactionModalProps {
  initialData?: Partial<Transaction>;
  budgetCategories: string[];
  categoryUsage: Record<string, number>;
  wallets: Wallet[];
  onAddBudgetCategory: (name: string) => void;
  onSave: (tx: Transaction | Omit<Transaction, "id">) => void | Promise<void>;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function TransactionModal({
  initialData = {},
  budgetCategories,
  categoryUsage,
  wallets,
  onAddBudgetCategory,
  onSave,
  onDelete,
  onClose,
}: TransactionModalProps) {
  const isEditing = !!initialData.id;
  const { t } = useTranslation("accounting");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { currency: globalCurrency } = useCurrency();
  const { projects } = useProjects();
  const { documents } = useDocuments();

  const [currentType, setCurrentType] = useState<TransactionType>(
    initialData.type ?? "revenue",
  );

  const form = useForm({
    defaultValues: {
      type: (initialData.type ?? "revenue") as TransactionType,
      amount: initialData.amount?.toString() ?? "",
      description: initialData.description ?? "",
      category: initialData.category ?? "",
      date: normalizeCalendarDateField(initialData.date) ?? todayCalendarDate(),
      status: (initialData.status ?? "received") as TransactionStatus,
      walletId:
        initialData.walletId ?? wallets.find((w) => w.isDefault)?.id ?? "",
      projectId: initialData.projectId ?? "",
      reference: initialData.reference ?? "",
      notes: initialData.notes ?? "",
      currency: initialData.currency ?? globalCurrency.code,
      isRecurring: initialData.isRecurring ?? false,
      recurringInterval: (initialData.recurringInterval ?? "monthly") as
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly",
      documentId: initialData.documentId ?? "",
    },
    validators: { onChange: transactionSchema() },
  });

  // Client validation only annotates the fields; the server is the authority on
  // what a transaction needs. The amount is the exception: the API rejects
  // anything not above zero, so catch it here rather than round-trip a raw 422.
  async function save() {
    const value = form.state.values;
    if (!(parseFloat(value.amount) > 0)) {
      form.setFieldMeta("amount", (meta) => ({ ...meta, isTouched: true }));
      return;
    }
    setIsSaving(true);
    try {
      const base = {
        type: value.type,
        amount: parseFloat(value.amount) || 0,
        description: value.description.trim(),
        category: value.type === "expense" ? value.category.trim() : "",
        date: normalizeCalendarDateField(value.date) ?? todayCalendarDate(),
        status: value.status,
        walletId: value.walletId || null,
        currency: value.currency,
        source: initialData.source ?? "manual",
        reviewedAt: initialData.reviewedAt ?? null,
        isRecurring: value.isRecurring,
        recurringInterval: value.isRecurring
          ? value.recurringInterval
          : undefined,
        ...(value.projectId ? { projectId: value.projectId } : {}),
        ...(value.reference.trim()
          ? { reference: value.reference.trim() }
          : {}),
        ...(value.notes.trim() ? { notes: value.notes.trim() } : {}),
        ...(value.documentId ? { documentId: value.documentId } : {}),
      };
      await onSave(
        isEditing && initialData.id ? { ...base, id: initialData.id } : base,
      );
    } finally {
      setIsSaving(false);
    }
  }

  const accent =
    currentType === "revenue" ? "var(--success)" : "var(--destructive)";

  function handleTypeChange(newType: TransactionType) {
    setCurrentType(newType);
    form.setFieldValue("type", newType);
    form.setFieldValue("status", newType === "revenue" ? "received" : "paid");
    if (newType === "revenue") form.setFieldValue("category", "");
  }

  const statusOptions = statusesFor(currentType);

  const categoryOptions = mergeCategoryLists(
    budgetCategories,
    currentType === "expense" && initialData.category?.trim()
      ? [initialData.category.trim()]
      : [],
  );

  const linkedWallet = (walletId: string) =>
    wallets.find((w) => w.id === walletId);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[min(85vh,680px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <DialogTitle className="font-semibold">
                {isEditing
                  ? t("transactions.editTransaction")
                  : t("transactions.newTransaction")}
              </DialogTitle>
              {initialData.source === "ai_receipt" &&
                !initialData.reviewedAt && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <AiBadge label={t("transactions.aiReview")} />
                      </span>
                    </TooltipTrigger>
                    {initialData.aiFlags && initialData.aiFlags.length > 0 && (
                      <TooltipContent side="top">
                        {initialData.aiFlags
                          .map((flag) => {
                            const key = aiFlagKey(flag);
                            return key ? t(key) : null;
                          })
                          .filter(Boolean)
                          .join(" · ")}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )}
            </div>
            <DialogDescription className="sr-only">
              {t("transactions.modal.recordDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <TransactionTypeCards
              value={currentType}
              onChange={handleTypeChange}
            />

            <form.Field name="description">
              {(field) => (
                <div>
                  <Input
                    id="description"
                    aria-label={t("transactions.modal.label")}
                    placeholder={t("transactions.modal.labelPlaceholder")}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className={
                      field.state.meta.isTouched &&
                      fieldError(field.state.meta.errors)
                        ? "border-destructive/60 focus:border-destructive"
                        : ""
                    }
                  />
                  {field.state.meta.isTouched &&
                    fieldError(field.state.meta.errors) && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldError(field.state.meta.errors)}
                      </p>
                    )}
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-[1fr_auto] items-start gap-3">
              <form.Field name="amount">
                {(field) => (
                  <div>
                    <div className="relative">
                      <form.Subscribe selector={(s) => s.values.currency}>
                        {(currencyCode) => (
                          <span
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold"
                            style={{ color: accent }}
                          >
                            {currencySymbol(
                              currencyCode,
                              globalCurrency.symbol,
                            )}
                          </span>
                        )}
                      </form.Subscribe>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={t("transactions.modal.amount")}
                        placeholder="0.00"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="pl-8 tabular-nums"
                        style={{
                          borderColor:
                            field.state.value &&
                            parseFloat(field.state.value) > 0
                              ? `color-mix(in srgb, ${accent} 50%, transparent)`
                              : undefined,
                          color:
                            field.state.value &&
                            parseFloat(field.state.value) > 0
                              ? accent
                              : undefined,
                        }}
                      />
                    </div>
                    {field.state.meta.isTouched &&
                      fieldError(field.state.meta.errors) && (
                        <p className="mt-1 text-xs text-destructive">
                          {fieldError(field.state.meta.errors)}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              <form.Field name="currency">
                {(field) => (
                  <div>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger
                        className="w-28"
                        aria-label={t("transactions.modal.currency")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>

            {currentType === "expense" && (
              <form.Field name="category">
                {(field) => (
                  <TransactionCategoryGrid
                    value={field.state.value}
                    onChange={field.handleChange}
                    categories={categoryOptions}
                    usage={categoryUsage}
                    onCreateCategory={onAddBudgetCategory}
                    accentColor={accent}
                    error={
                      field.state.meta.isTouched
                        ? fieldError(field.state.meta.errors)
                        : undefined
                    }
                  />
                )}
              </form.Field>
            )}

            <form.Field name="date">
              {(field) => (
                <div className="flex items-center gap-3">
                  <Label htmlFor="date" className="w-16 shrink-0 text-xs">
                    {t("transactions.table.date")}
                  </Label>
                  <div className="min-w-0 flex-1">
                    <DatePicker
                      id="date"
                      value={field.state.value}
                      placeholder={t("transactions.modal.pickDate")}
                      onChange={(value) =>
                        field.handleChange(value ?? todayCalendarDate())
                      }
                    />
                  </div>
                </div>
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => {
                const statusValue = statusOptions.some(
                  (opt) => opt.value === field.state.value,
                )
                  ? field.state.value
                  : statusOptions[0].value;
                return (
                  <div className="flex items-center gap-3">
                    <Label className="w-16 shrink-0 text-xs">
                      {t("transactions.table.status")}
                    </Label>
                    <div className="min-w-0 flex-1">
                      <Select
                        value={statusValue}
                        onValueChange={(v) =>
                          field.handleChange(v as TransactionStatus)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="walletId">
              {(field) => (
                <div>
                  <TransactionWalletChips
                    wallets={wallets}
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                  <form.Subscribe selector={(s) => s.values.currency}>
                    {(currencyCode) => {
                      const wallet = linkedWallet(field.state.value) as
                        | (Wallet & { currency?: string })
                        | undefined;
                      const walletCurrency = wallet?.currency;
                      if (!walletCurrency || walletCurrency === currencyCode) {
                        return null;
                      }
                      return (
                        <p className="mt-1.5 text-xs text-warning">
                          {t("transactions.modal.walletCurrencyDiffers", {
                            currency: currencyCode,
                            walletCurrency,
                          })}
                        </p>
                      );
                    }}
                  </form.Subscribe>
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-3">
              <form.Field name="projectId">
                {(field) => (
                  <div>
                    <Select
                      value={field.state.value || "none"}
                      onValueChange={(v) =>
                        field.handleChange(v === "none" ? "" : v)
                      }
                    >
                      <SelectTrigger aria-label={t("transactions.modal.project")}>
                        <SelectValue
                          placeholder={t("transactions.modal.noProject")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {t("transactions.modal.noProject")}
                        </SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              <form.Field name="reference">
                {(refField) => (
                  <form.Field name="documentId">
                    {(docField) => (
                      <form.Subscribe selector={(s) => s.values.projectId}>
                        {(projectId) => (
                          <TransactionInvoicePicker
                            documents={documents}
                            documentId={docField.state.value}
                            reference={refField.state.value}
                            onReferenceChange={refField.handleChange}
                            onLinkChange={docField.handleChange}
                            projectId={projectId}
                            referenceError={
                              refField.state.meta.isTouched
                                ? fieldError(refField.state.meta.errors)
                                : undefined
                            }
                          />
                        )}
                      </form.Subscribe>
                    )}
                  </form.Field>
                )}
              </form.Field>
            </div>

            <form.Field name="notes">
              {(field) => (
                <div>
                  <Textarea
                    rows={2}
                    aria-label={t("transactions.modal.notes")}
                    placeholder={t("transactions.modal.notesPlaceholder")}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.isTouched &&
                    fieldError(field.state.meta.errors) && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldError(field.state.meta.errors)}
                      </p>
                    )}
                </div>
              )}
            </form.Field>

            <form.Field name="isRecurring">
              {(recurringField) => (
                <div className="space-y-3 rounded-xl border border-border-subtle p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t("transactions.modal.recurring")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("transactions.modal.recurringHint")}
                      </p>
                    </div>
                    <Switch
                      checked={recurringField.state.value}
                      onCheckedChange={recurringField.handleChange}
                      size="sm"
                    />
                  </div>
                  <AnimatePresence initial={false}>
                    {recurringField.state.value && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <form.Field name="recurringInterval">
                          {(intervalField) => (
                            <div>
                              <Label className="mb-1.5 block">
                                {t("transactions.modal.interval")}
                              </Label>
                              <Select
                                value={intervalField.state.value}
                                onValueChange={(v) =>
                                  intervalField.handleChange(
                                    v as
                                      | "weekly"
                                      | "monthly"
                                      | "quarterly"
                                      | "yearly",
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">
                                    {t("transactions.modal.weekly")}
                                  </SelectItem>
                                  <SelectItem value="monthly">
                                    {t("transactions.modal.monthly")}
                                  </SelectItem>
                                  <SelectItem value="quarterly">
                                    {t("transactions.modal.quarterly")}
                                  </SelectItem>
                                  <SelectItem value="yearly">
                                    {t("transactions.modal.yearly")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </form.Field>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </form.Field>
          </div>

          <div className="drawer-footer">
            <AnimatePresence mode="wait">
              {confirmDelete ? (
                <motion.div
                  key="confirm-delete"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.14 }}
                  className="flex items-center gap-1.5"
                >
                  <p className="flex-1 text-xs text-muted-foreground">
                    {t("transactions.modal.deleteConfirm")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
                  >
                    {t("transactions.modal.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete?.(initialData.id!);
                      onClose();
                    }}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                  >
                    {t("transactions.modal.delete")}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="flex justify-end gap-1.5"
                >
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="mr-auto flex size-7 shrink-0 items-center justify-center rounded-lg border border-input transition-all hover:bg-destructive/10"
                    >
                      <Trash2
                        size={13}
                        className="text-destructive opacity-65"
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised"
                  >
                    {t("transactions.modal.cancel")}
                  </button>
                  <form.Subscribe
                    selector={(s) => ({
                      amount: s.values.amount,
                      currency: s.values.currency,
                    })}
                  >
                    {({ amount, currency }) => {
                      const parsed = parseFloat(amount);
                      const cta =
                        Number.isFinite(parsed) && parsed > 0
                          ? isEditing
                            ? t("transactions.modal.saveChanges")
                            : t("transactions.modal.addAmount", {
                                amount: formatSignedAmount(
                                  parsed,
                                  currency,
                                  globalCurrency.symbol,
                                ),
                                type: t(
                                  currentType === "revenue"
                                    ? "transactions.modal.income"
                                    : "transactions.modal.expense",
                                ),
                              })
                          : isEditing
                            ? t("transactions.modal.saveChanges")
                            : t("transactions.modal.addTransaction");
                      return (
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                        >
                          {isSaving ? t("transactions.modal.saving") : cta}
                        </button>
                      );
                    }}
                  </form.Subscribe>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
