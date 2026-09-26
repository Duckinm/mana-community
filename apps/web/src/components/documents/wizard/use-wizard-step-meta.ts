import { documentTypeLabelKey } from "@/components/documents/document-type-labels";
import type { DocumentType } from "@/components/documents/types";
import {
  getWizardSteps,
  hasPaymentStep,
} from "@/components/documents/wizard/wizard-step-config";
import { useTranslation } from "react-i18next";

export function useWizardStepMeta(documentType: DocumentType) {
  const { t } = useTranslation("documents");

  const STEPS = [
    { step: "1", title: t("formSteps.yourDetails") },
    { step: "2", title: t("formSteps.clientDetails") },
    {
      step: "3",
      title: t(documentTypeLabelKey(documentType, "lineItemsTitle")),
    },
    ...(hasPaymentStep(documentType)
      ? [{ step: "4" as const, title: t("formSteps.paymentDetails") }]
      : []),
    {
      step: "5",
      title: t(documentTypeLabelKey(documentType, "formStepTerms")),
    },
    { step: "6", title: t("formSteps.reviewSave") },
  ].filter((s) => getWizardSteps(documentType).includes(s.step));

  return STEPS;
}
