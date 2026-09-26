import { GuestDocumentView } from "@/components/documents/guest/guest-document-view";
import { promotionProjectedDocument } from "@/components/documents/preview/projected-document";
import { PromotionPageShell } from "@/components/documents/promotion/promotion-page-shell";
import { PromotionWizardSkeleton } from "@/components/documents/promotion/promotion-wizard-skeleton";
import { DateField, RemarkTemplateSelect, TextField, WalletSelect } from "@/components/documents/promotion/promotion-fields";
import {
  invToRcSchema,
  rcStepValid,
} from "@/components/documents/promotion/promotion-schema";
import { useWizardSteps } from "@/components/documents/promotion/use-wizard-steps";
import { previewNextDocumentNumber } from "@/components/documents/wizard/document-number-preview";
import type { Document } from "@/components/documents/types";
import { useDocuments } from "@/hooks/use-documents";
import { useWallets } from "@/hooks/use-wallets";
import { todayCalendarDate } from "@/lib/calendar-date";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "@/lib/i18n";

interface InvToRcFormProps {
  doc: Document;
  onCancel: () => void;
  onSuccess: (d: Document) => void;
  title: string;
  subtitle: string;
}

export function InvToRcForm({
  doc,
  onCancel,
  onSuccess,
  title,
  subtitle,
}: InvToRcFormProps) {
  const { t } = useTranslation("documents");
  const { documents, promoteDocument, publishDocument } = useDocuments();
  const { wallets, isLoading } = useWallets();
  const wizard = useWizardSteps(2);
  const [submitting, setSubmitting] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);

  const nextNumber = previewNextDocumentNumber(documents, "RC");

  const selectedWallet =
    wallets.find((w) => w.id === walletId) ??
    wallets.find((w) => w.isDefault) ??
    wallets[0];

  const paymentTermsText = selectedWallet
    ? i18next.t("promotion.paymentMethodPrefix", {
        ns: "documents",
        method: i18next.t(`walletManager.methods.${selectedWallet.type}`, { ns: "accounting" }),
      })
    : null;

  const today = todayCalendarDate();
  // Shape only, never a default: the 50 ทวิ number is issued by the client who
  // withheld the tax, so anything we pre-fill would be a number nobody can verify.
  const certNumberExample = `WHT-${today.slice(0, 4)}-001`;

  const form = useForm({
    defaultValues: {
      paidAt: today,
      remark: doc.remark ?? null,
      whtCertNumber: null as string | null,
    },
    validators: { onChange: invToRcSchema },
  });

  async function handleSubmit(publish: boolean) {
    const v = form.state.values;
    setSubmitting(true);
    try {
      const newDoc = await promoteDocument(doc.id, {
        paidAt: v.paidAt,
        remark: v.remark?.trim() || null,
        paymentTermsText,
        whtCertNumber: v.whtCertNumber,
        walletId: selectedWallet?.id,
      });
      if (publish) await publishDocument(newDoc.id);
      onSuccess(newDoc);
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = [t("promotion.stepPaymentWht"), t("promotion.stepReview")];

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
        const paidError =
          doc.issueDate && values.paidAt < doc.issueDate
            ? t("promotion.paidBeforeIssue")
            : undefined;

        return (
          <PromotionPageShell
            title={title}
            subtitle={subtitle}
            defaultLang={doc.documentLanguage}
            preview={(lang) => (
              <GuestDocumentView
                document={promotionProjectedDocument(doc, {
                  type: "RC",
                  number: nextNumber,
                  lang,
                  issueDate: doc.issueDate,
                  dueDate: null,
                  whtRateBps: doc.whtRateBps,
                  remark: values.remark,
                  paymentTermsText,
                  paidAt: values.paidAt,
                })}
              />
            )}
            step={wizard.step}
            direction={wizard.direction}
            totalSteps={wizard.totalSteps}
            stepLabels={stepLabels}
            canAdvance={rcStepValid(wizard.step, values, doc.issueDate)}
            isLastStep={wizard.isLastStep}
            onCancel={onCancel}
            onBack={wizard.back}
            onNext={wizard.next}
          >
            {wizard.step === 0 && (
              <>
                <form.Field name="paidAt">
                  {(field) => (
                    <DateField
                      label={t("promotion.paymentDate")}
                      value={field.state.value}
                      onChange={field.handleChange}
                      error={paidError}
                    />
                  )}
                </form.Field>

                {wallets.length > 0 && (
                  <WalletSelect
                    wallets={wallets}
                    label={t("promotion.wallet")}
                    value={selectedWallet?.id ?? ""}
                    onChange={setWalletId}
                  />
                )}

                {doc.whtCents > 0 && (
                  <form.Field name="whtCertNumber">
                    {(field) => (
                      <TextField
                        label={t("promotion.whtCertNumber")}
                        value={field.state.value ?? ""}
                        onChange={(v) => field.handleChange(v || null)}
                        placeholder={certNumberExample}
                      />
                    )}
                  </form.Field>
                )}

                <form.Field name="remark">
                  {(field) => (
                    <RemarkTemplateSelect
                      targetType="RC"
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
