import { GuestDocumentView } from "@/components/documents/guest/guest-document-view";
import { promotionProjectedDocument } from "@/components/documents/preview/projected-document";
import { PromotionPageShell } from "@/components/documents/promotion/promotion-page-shell";
import { PromotionWizardSkeleton } from "@/components/documents/promotion/promotion-wizard-skeleton";
import { DateField, RemarkTemplateSelect, WalletSelect } from "@/components/documents/promotion/promotion-fields";
import {
  PAYMENT_TERM_PRESETS,
  dueDateForTerm,
  qoStepValid,
  qoToInvSchema,
  type PaymentTermPresetId,
} from "@/components/documents/promotion/promotion-schema";
import { useWizardSteps } from "@/components/documents/promotion/use-wizard-steps";
import { previewNextDocumentNumber } from "@/components/documents/wizard/document-number-preview";
import type { Document } from "@/components/documents/types";
import { useContacts } from "@/context/contacts";
import { useDocuments } from "@/hooks/use-documents";
import { useSenderProfiles } from "@/hooks/use-sender-profiles";
import { useWallets } from "@/hooks/use-wallets";
import { addCalendarDays, todayCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useForm } from "@tanstack/react-form";
import { Minus, Plus } from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const WHT_STEP_BPS = 50;
const WHT_MIN_BPS = 0;
const WHT_MAX_BPS = 1000;

interface QoToInvFormProps {
  doc: Document;
  onCancel: () => void;
  onSuccess: (d: Document) => void;
  title: string;
  subtitle: string;
}

export function QoToInvForm({
  doc,
  onCancel,
  onSuccess,
  title,
  subtitle,
}: QoToInvFormProps) {
  const { t } = useTranslation("documents");
  const { documents, promoteDocument, publishDocument } = useDocuments();
  const { wallets, isLoading } = useWallets();
  const { senderProfiles } = useSenderProfiles();
  const { contacts } = useContacts();
  // Withholding tax only arises when a juristic person is party to the invoice.
  // Two individuals never withhold, so the stepper is noise for them. Parties we
  // cannot resolve stay eligible — hiding a real WHT field is the worse error.
  const senderEntity = senderProfiles.find((p) => p.id === doc.senderProfileId)?.entityType;
  const clientEntity = contacts.find((c) => c.id === doc.contactId)?.entityType;
  const showWht = !(senderEntity === "individual" && clientEntity === "individual");
  const paymentTemplates = wallets.filter((w) => w.showOnInvoice);
  const wizard = useWizardSteps(2);
  const [submitting, setSubmitting] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);

  const nextNumber = previewNextDocumentNumber(documents, "INV");

  const selectedWallet =
    paymentTemplates.find((w) => w.id === walletId) ??
    paymentTemplates.find((w) => w.isDefaultInvoice) ??
    paymentTemplates[0];

  const payment = selectedWallet
    ? {
        bankName: selectedWallet.bankName,
        accountNumber: selectedWallet.accountNumber,
        accountName: selectedWallet.accountName,
        swiftCode: selectedWallet.swiftCode,
        promptPayId: selectedWallet.promptPayId,
        cardNumber: selectedWallet.cardNumber,
        cardExpiry: selectedWallet.cardExpiry,
        cardholderName: selectedWallet.cardholderName,
      }
    : {
        bankName: doc.bankName ?? null,
        accountNumber: doc.accountNumber ?? null,
        accountName: doc.accountName ?? null,
        swiftCode: doc.swiftCode ?? null,
        promptPayId: doc.promptPayId ?? null,
        cardNumber: doc.cardNumber ?? null,
        cardExpiry: doc.cardExpiry ?? null,
        cardholderName: doc.cardholderName ?? null,
      };

  const today = todayCalendarDate();

  const form = useForm({
    defaultValues: {
      issueDate: today,
      dueDate: addCalendarDays(today, 14),
      paymentTermPreset: "net14" as PaymentTermPresetId | null,
      paymentTermsText: doc.paymentTermsText ?? null,
      whtRateBps: showWht ? (doc.whtRateBps ?? 0) : 0,
      remark: doc.remark ?? null,
    },
    validators: { onChange: qoToInvSchema },
  });

  async function handleSubmit(publish: boolean) {
    const v = form.state.values;
    setSubmitting(true);
    try {
      const newDoc = await promoteDocument(doc.id, {
        issueDate: v.issueDate,
        dueDate: v.dueDate,
        paymentTermsText: v.paymentTermsText,
        whtRateBps: v.whtRateBps,
        remark: v.remark?.trim() || null,
        ...payment,
      });
      if (publish) await publishDocument(newDoc.id);
      onSuccess(newDoc);
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = [
    t("promotion.stepDatesTax"),
    t("userInputForm.reviewSaveTitle"),
  ];

  if (isLoading) {
    return (
      <PromotionPageShell
        title={title}
        subtitle={subtitle}
        defaultLang={doc.documentLanguage}
        preview={() => <PromotionWizardSkeleton />}
        step={0}
        direction={1}
        totalSteps={2}
        stepLabels={stepLabels}
        canAdvance={false}
        isLastStep={false}
        onCancel={onCancel}
        onBack={wizard.back}
        onNext={wizard.next}
      >
        <PromotionWizardSkeleton />
      </PromotionPageShell>
    );
  }

  return (
    <form.Subscribe selector={(s) => s.values}>
      {(values) => {
        const dueError =
          values.dueDate < values.issueDate ? t("promotion.dueBeforeIssue") : undefined;

        return (
          <PromotionPageShell
            title={title}
            subtitle={subtitle}
            defaultLang={doc.documentLanguage}
            preview={(lang) => (
              <GuestDocumentView
                document={promotionProjectedDocument(doc, {
                  type: "INV",
                  number: nextNumber,
                  lang,
                  issueDate: values.issueDate,
                  dueDate: values.dueDate,
                  whtRateBps: values.whtRateBps,
                  remark: values.remark,
                  paymentTermsText: values.paymentTermsText,
                  payment,
                })}
              />
            )}
            step={wizard.step}
            direction={wizard.direction}
            totalSteps={wizard.totalSteps}
            stepLabels={stepLabels}
            canAdvance={qoStepValid(wizard.step, values)}
            isLastStep={wizard.isLastStep}
            onCancel={onCancel}
            onBack={wizard.back}
            onNext={wizard.next}
          >
            {wizard.step === 0 && (
              <>
                <form.Field name="paymentTermPreset">
                  {(field) => (
                    <div className="space-y-3">
                      <span className="block text-sm font-medium text-ink">
                        {t("promotion.paymentTerms")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {PAYMENT_TERM_PRESETS.map((preset) => {
                          const active = field.state.value === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => {
                                field.handleChange(preset.id);
                                form.setFieldValue(
                                  "dueDate",
                                  dueDateForTerm(form.state.values.issueDate, preset.id),
                                );
                                form.setFieldValue(
                                  "paymentTermsText",
                                  t(`promotion.terms.${preset.id}`),
                                );
                              }}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-base",
                                active
                                  ? "border-primary-border bg-primary-soft text-primary"
                                  : "border-border-subtle bg-surface-input text-muted-foreground hover:border-border-default hover:text-foreground",
                              )}
                            >
                              {t(`promotion.terms.${preset.id}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </form.Field>
                <form.Field name="issueDate">
                  {(field) => (
                    <DateField
                      label={t("promotion.issueDate")}
                      value={field.state.value}
                      onChange={(v) => {
                        field.handleChange(v);
                        const preset = form.state.values.paymentTermPreset;
                        if (preset) form.setFieldValue("dueDate", dueDateForTerm(v, preset));
                      }}
                    />
                  )}
                </form.Field>
                <form.Field name="dueDate">
                  {(field) => (
                    <DateField
                      label={t("promotion.dueDate")}
                      value={field.state.value}
                      error={dueError}
                      onChange={(v) => {
                        field.handleChange(v);
                        form.setFieldValue("paymentTermPreset", null);
                      }}
                    />
                  )}
                </form.Field>

                {showWht && (
                  <form.Field name="whtRateBps">
                    {(field) => (
                      <div className="flex h-11 items-center justify-between">
                        <span className="text-sm font-medium text-ink">
                          {t("promotion.wht")}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={t("promotion.whtRateDecrease")}
                            disabled={field.state.value <= WHT_MIN_BPS}
                            onClick={() =>
                              field.handleChange(
                                Math.max(WHT_MIN_BPS, field.state.value - WHT_STEP_BPS),
                              )
                            }
                            className="flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground disabled:opacity-40"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-14 text-center font-mono text-sm tabular-nums text-foreground">
                            {field.state.value / 100}%
                          </span>
                          <button
                            type="button"
                            aria-label={t("promotion.whtRateIncrease")}
                            disabled={field.state.value >= WHT_MAX_BPS}
                            onClick={() =>
                              field.handleChange(
                                Math.min(WHT_MAX_BPS, field.state.value + WHT_STEP_BPS),
                              )
                            }
                            className="flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </form.Field>
                )}

                {paymentTemplates.length > 0 && (
                  <WalletSelect
                    wallets={paymentTemplates}
                    label={t("promotion.wallet")}
                    value={selectedWallet?.id ?? ""}
                    onChange={setWalletId}
                  />
                )}
                <form.Field name="remark">
                  {(field) => (
                    <RemarkTemplateSelect
                      targetType="INV"
                      sourceRemark={doc.remark}
                      sourceNumber={doc.number}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  )}
                </form.Field>
              </>
            )}

            {wizard.step === 1 && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("userInputForm.reviewSaveDescription")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="w-full rounded-xl"
                >
                  {t("userInputForm.saveDraft")}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="w-full rounded-xl"
                >
                  {submitting
                    ? t("userInputForm.publishing")
                    : t("userInputForm.publishNumber", { number: nextNumber })}
                </Button>
              </>
            )}
          </PromotionPageShell>
        );
      }}
    </form.Subscribe>
  );
}
