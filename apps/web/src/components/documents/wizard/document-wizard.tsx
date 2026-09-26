import { WizardDocumentPreview } from "@/components/documents/wizard/wizard-document-preview";
import type { Document, DocumentType } from "@/components/documents/types";
import {
  wizardFormDefaults,
  wizardValuesToCreateInput,
  wizardValuesToContactInput,
  wizardFormSchema,
} from "@/components/documents/wizard/document-wizard-state";
import { DocumentPreviewSheet } from "@/components/documents/wizard/document-preview-sheet";
import { FormSteps } from "@/components/documents/wizard/form-steps";
import { PreviewLangToggle } from "@/components/documents/wizard/preview-lang-toggle";
import { UserInputForm } from "@/components/documents/wizard/user-input-form";
import { WizardPreviewLangContext } from "@/components/documents/wizard/wizard-preview-lang-context";
import { WizardValuesContext } from "@/components/documents/wizard/wizard-values-context";
import { useDocuments } from "@/hooks/use-documents";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Eye } from "@/components/icons";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useWizardDirtyGuard } from "@/components/documents/wizard/use-wizard-dirty-guard";
import { useWizardSteps } from "@/components/documents/wizard/use-wizard-steps";
import {
  validateStep,
  type StepValidity,
} from "@/components/documents/wizard/wizard-step-validation";
import { previewNextDocumentNumber } from "@/components/documents/wizard/document-number-preview";
import { getWizardSteps } from "@/components/documents/wizard/wizard-step-config";
import { applyContactToForm } from "@/components/documents/wizard/client-details/client-prefill";
import { useContacts } from "@/context/contacts";
import {
  clearWizardDraft,
  getWizardDraft,
  setWizardDraft,
  wizardDraftKey,
} from "@/components/documents/wizard/wizard-draft-store";

export type {
  WizardFormValues,
  WizardItem,
} from "@/components/documents/wizard/document-wizard-state";

interface DocumentWizardProps {
  documentType: DocumentType;
  initialData?: Document;
  defaultProjectId?: string;
  defaultContactId?: string;
  onSuccess?: (doc: Document) => void;
  backTo?: string;
}

export function DocumentWizard({
  documentType,
  initialData,
  defaultProjectId,
  defaultContactId,
  onSuccess,
  backTo,
}: DocumentWizardProps) {
  const { t } = useTranslation("documents");
  const [submitting, setSubmitting] = useState(false);
  const [previewLang, setPreviewLang] = useState<"th" | "en">("th");
  const [previewOpen, setPreviewOpen] = useState(false);
  const { documents, createDocument, updateDocument, publishDocument } =
    useDocuments();
  const { contacts, addContact } = useContacts();
  const navigate = useNavigate();

  const validationT = (key: string) => t(`stepValidation.${key}`);

  const draftKey = useMemo(
    () => wizardDraftKey(documentType, initialData?.id),
    [documentType, initialData?.id],
  );
  const form = useForm({
    defaultValues:
      getWizardDraft(draftKey) ??
      wizardFormDefaults(documentType, initialData, defaultProjectId),
    // Validate on submit only — live onChange errors nag while you're still typing.
    validators: { onSubmit: wizardFormSchema },
  });
  useWizardDirtyGuard(form);
  const wizardSteps = useWizardSteps(form, documentType);

  useEffect(() => {
    const { unsubscribe } = form.store.subscribe(() =>
      setWizardDraft(draftKey, form.state.values),
    );
    return unsubscribe;
  }, [form, draftKey]);

  useEffect(() => {
    if (!defaultContactId || initialData || form.getFieldValue("contactId"))
      return;
    const contact = contacts.find((c) => c.id === defaultContactId);
    if (contact) applyContactToForm(form, contact);
  }, [defaultContactId, initialData, contacts, form]);

  async function surfaceStepErrors(step: string, validity: StepValidity) {
    const fields =
      validity.fields ?? (validity.field ? [validity.field] : []);
    wizardSteps.goTo(step);

    if (fields.length > 0) {
      await form.validate("submit");
      for (const field of fields) {
        form.setFieldMeta(field, (meta) => ({ ...meta, isTouched: true }));
      }
    } else if (validity.message) {
      toast.error(validity.message);
    }

    const firstField = fields[0];
    if (firstField) {
      requestAnimationFrame(() => {
        const el = document.getElementById(firstField);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus();
      });
    }
  }

  async function handleNext() {
    const step = form.state.values.step;
    const validity = validateStep(step, form.state.values, validationT);
    if (!validity.valid) {
      await surfaceStepErrors(step, validity);
      return;
    }
    wizardSteps.next();
  }

  async function handleSave(publish = false) {
    const values = form.state.values;

    const firstInvalid = getWizardSteps(documentType)
      .map((step) => ({
        step,
        validity: validateStep(step, values, validationT),
      }))
      .find(({ validity }) => !validity.valid);

    if (firstInvalid) {
      await surfaceStepErrors(firstInvalid.step, firstInvalid.validity);
      return;
    }

    setSubmitting(true);
    try {
      const payload = wizardValuesToCreateInput(values);
      if (values.addToContactLibrary && !values.contactId) {
        const contactInput = wizardValuesToContactInput(values);
        if (contactInput)
          payload.contactId = (await addContact(contactInput)).id;
      }

      let doc: Document;
      if (initialData) {
        doc = await updateDocument(initialData.id, payload);
        if (publish) await publishDocument(initialData.id);
      } else {
        doc = await createDocument(payload);
        if (publish) await publishDocument(doc.id);
      }

      toast.success(
        publish
          ? t("documentWizard.documentPublished")
          : t("documentWizard.draftSaved"),
      );
      clearWizardDraft(draftKey);

      if (onSuccess) {
        onSuccess(doc);
      } else {
        navigate({
          to: "/documents/$documentId",
          params: { documentId: doc.id },
        });
      }
      // Every mutation reached from here toasts its own translated error; a second
      // toast built from the raw server message would only surface English to a Thai UI.
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  function handleStepClick(step: string) {
    wizardSteps.goTo(step);
  }

  function handleReset() {
    if (!window.confirm(t("documentWizard.resetConfirm"))) return;
    clearWizardDraft(draftKey);
    form.reset(wizardFormDefaults(documentType, initialData, defaultProjectId));
  }

  return (
    <form.Subscribe selector={(state) => state.values}>
      {(values) => (
        <WizardPreviewLangContext.Provider value={previewLang}>
          <WizardValuesContext.Provider value={values}>
            <div className="flex h-full w-full">
              <div className="flex w-full min-w-0 flex-col overflow-hidden lg:w-[40%] lg:border-r lg:border-dashed lg:border-border-strong">
                <div className="flex shrink-0 items-center justify-between px-6 pt-4">
                  {backTo ? (
                    <Link
                      to={backTo as "/documents"}
                      className="inline-flex min-h-11 items-center gap-1 text-xs text-caption transition-colors duration-fast hover:text-muted-foreground lg:min-h-0"
                    >
                      <ChevronLeft size={12} />
                      {t("documentWizard.back")}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="inline-flex min-h-11 items-center gap-1.5 text-xs text-caption transition-colors duration-fast hover:text-foreground lg:hidden lg:min-h-0"
                    >
                      <Eye size={12} strokeWidth={2} />
                      {t("documentWizard.preview")}
                    </button>
                    <form.Subscribe selector={(state) => state.isDirty}>
                      {(isDirty) =>
                        isDirty && (
                          <button
                            type="button"
                            onClick={handleReset}
                            className="min-h-11 text-xs text-caption transition-colors duration-fast hover:text-destructive lg:min-h-0"
                          >
                            {t("documentWizard.reset")}
                          </button>
                        )
                      }
                    </form.Subscribe>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <UserInputForm
                    form={form}
                    documentNumber={initialData?.number}
                    publishNumber={
                      initialData?.number ??
                      previewNextDocumentNumber(documents, values.type)
                    }
                    onSaveDraft={() => handleSave(false)}
                    onPublish={() => handleSave(true)}
                    isSubmitting={submitting}
                    onStepChange={wizardSteps.goTo}
                  />
                </div>

                <div className="shrink-0 border-t border-dashed border-border-strong p-4 max-xl:pb-mobile-dock md:px-8 xl:pb-8">
                  <FormSteps
                    step={values.step}
                    documentType={values.type}
                    onStepChange={wizardSteps.goTo}
                    onNext={handleNext}
                  />
                </div>
              </div>

              <div className="relative hidden flex-1 items-start justify-center overflow-y-auto bg-[radial-gradient(var(--border-default)_1px,transparent_1px)] p-8 pt-14 [background-size:16px_16px] lg:flex">
                <div className="absolute top-4 right-4 z-10">
                  <PreviewLangToggle
                    value={previewLang}
                    onChange={setPreviewLang}
                  />
                </div>
                <WizardDocumentPreview
                  onStepClick={handleStepClick}
                  documentNumber={initialData?.number}
                />
              </div>

              <DocumentPreviewSheet
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                previewLang={previewLang}
                onPreviewLangChange={setPreviewLang}
              >
                <WizardDocumentPreview
                  onStepClick={(step) => {
                    handleStepClick(step);
                    setPreviewOpen(false);
                  }}
                  documentNumber={initialData?.number}
                />
              </DocumentPreviewSheet>
            </div>
          </WizardValuesContext.Provider>
        </WizardPreviewLangContext.Provider>
      )}
    </form.Subscribe>
  );
}
