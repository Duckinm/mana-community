import { useCapabilities } from "@/hooks/use-capabilities";
import { EmailCapabilityNotice } from "@/components/capability-notice";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDocuments } from "@/hooks/use-documents";
import type { Document } from "@/components/documents/types";
import { DOCUMENT_TYPE_KEYS, DOCUMENT_TYPE_LOWER_KEYS } from "@/components/documents/constants";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PublishDialog({
  doc,
  open,
  onClose,
  onSuccess,
}: {
  doc: Document;
  open: boolean;
  onClose: () => void;
  onSuccess?: (doc: Document) => void;
}) {
  const { t } = useTranslation("documents");
  const { t: tCapabilities } = useTranslation("capabilities");
  const capabilities = useCapabilities();
  const emailAvailable = !capabilities.isError && !!capabilities.data && capabilities.data.email !== 'disabled';
  const { publishDocument } = useDocuments();
  const [sendEmail, setSendEmail] = useState(!!doc.clientEmail);
  const [submitting, setSubmitting] = useState(false);

  const label = t(DOCUMENT_TYPE_KEYS[doc.type]);
  const labelLower = t(DOCUMENT_TYPE_LOWER_KEYS[doc.type]);
  const hasClientEmail = !!doc.clientEmail;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const { document, emailStatus } = await publishDocument(doc.id, sendEmail && hasClientEmail && emailAvailable);

      if (emailStatus === "sent") {
        toast.success(capabilities.data?.email === "local" ? tCapabilities("localEmail") : t("publishDialog.publishedEmailSent", { email: doc.clientEmail }));
      } else if (emailStatus === "failed") {
        toast.warning(t("publishDialog.publishedEmailFailed"));
      } else if (emailStatus === "blocked") {
        toast.warning(t("publishDialog.publishedEmailBlocked"));
      } else if (emailStatus === "plan_limit") {
        toast.warning(t("publishDialog.publishedEmailPlanLimit"));
      } else {
        toast.success(t("publishDialog.published"));
      }

      onSuccess?.(document);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {t("publishDialog.title", { type: label, number: doc.number })}
          </DialogTitle>
          <DialogDescription>
            {doc.clientName ? t("publishDialog.descriptionFor", { client: doc.clientName }) : null}{" "}
            {t("publishDialog.descriptionBody")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 px-4 py-3">
          <EmailCapabilityNotice />
          <label className="flex items-start gap-3">
            <Checkbox
              checked={hasClientEmail && emailAvailable ? sendEmail : false}
              disabled={!hasClientEmail || !emailAvailable}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              {t("publishDialog.emailLabel", {
                type: labelLower,
                recipient: hasClientEmail ? doc.clientEmail : t("publishDialog.client"),
              })}
              {!hasClientEmail && (
                <span className="block text-xs text-caption">{t("publishDialog.noClientEmail")}</span>
              )}
            </span>
          </label>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
          >
            {t("publishDialog.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
          >
            {t("publishDialog.publish")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
