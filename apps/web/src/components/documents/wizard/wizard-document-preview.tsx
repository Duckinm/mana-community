import {
  GuestDocumentView,
  type DocumentPreviewSection,
} from "@/components/documents/guest/guest-document-view";
import { wizardValuesToProjectedDocument } from "@/components/documents/preview/projected-document";
import { usePreviewLang } from "@/components/documents/wizard/wizard-preview-lang-context";
import { useWizardValues } from "@/components/documents/wizard/wizard-values-context";
import { useShowBranding } from "@/hooks/use-show-branding";
import { useMemo } from "react";

const STEP_FOR_SECTION: Record<DocumentPreviewSection, string> = {
  terms: "5",
  your: "1",
  client: "2",
  items: "3",
  payment: "4",
  remark: "5",
};

interface WizardDocumentPreviewProps {
  onStepClick: (step: string) => void;
  documentNumber?: string;
}

export function WizardDocumentPreview({
  onStepClick,
  documentNumber,
}: WizardDocumentPreviewProps) {
  const values = useWizardValues();
  const lang = usePreviewLang();
  const showBranding = useShowBranding();
  const doc = useMemo(
    () =>
      wizardValuesToProjectedDocument(values, { number: documentNumber, lang }),
    [values, documentNumber, lang],
  );

  return (
    <div className="w-[595px] max-w-full shrink-0">
      <GuestDocumentView
        document={doc}
        onSectionClick={(section) => onStepClick(STEP_FOR_SECTION[section])}
        showBranding={showBranding}
      />
    </div>
  );
}
