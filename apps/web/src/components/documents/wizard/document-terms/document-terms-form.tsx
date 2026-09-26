import { documentTypeLabelKey } from "@/components/documents/document-type-labels";
import { DatePicker } from "@/components/documents/ui/date-picker";
import { FieldInput } from "@/components/documents/ui/field-input";
import type { WizardForm } from "@/components/documents/wizard/document-wizard-state";
import { WizardProgress } from "@/components/documents/wizard/wizard-progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useProjects } from "@/context/projects";
import { useRemarkTemplates } from "@/hooks/use-remark-templates";
import { useStore } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface DocumentTermsFormProps {
  form: WizardForm;
  documentNumber?: string;
  onStepChange: (step: string) => void;
}

export function DocumentTermsForm({
  form,
  documentNumber,
  onStepChange,
}: DocumentTermsFormProps) {
  const { t } = useTranslation("documents");
  const { projects } = useProjects();
  const documentType = useStore(form.store, (state) => state.values.type);
  const activeProjects = projects.filter((p) => !p.archived && !p.deletedAt);
  const {
    remarkTemplates,
    isLoading: templatesLoading,
    defaultTemplateFor,
  } = useRemarkTemplates();
  const defaultTemplate = defaultTemplateFor(documentType);

  useEffect(() => {
    const currentRemark = form.getFieldValue("remark");
    const currentTemplateId = form.getFieldValue("remarkTemplateId");
    if (defaultTemplate && !currentTemplateId && !currentRemark?.trim()) {
      form.setFieldValue("remarkTemplateId", defaultTemplate.id);
      form.setFieldValue("remark", defaultTemplate.body);
    }
  }, [defaultTemplate, form]);

  function handleRemarkTemplateSelect(id: string) {
    if (id === "__none__") {
      form.setFieldValue("remarkTemplateId", null);
      form.setFieldValue("remark", null);
      return;
    }
    const template = remarkTemplates.find((row) => row.id === id);
    if (template) {
      form.setFieldValue("remarkTemplateId", template.id);
      form.setFieldValue("remark", template.body);
    }
  }

  return (
    <form.Subscribe selector={(s) => s.values.type}>
      {(type) => (
        <div>
          <p className="pb-3 text-2xl font-semibold">
            {t(documentTypeLabelKey(type, "termsTitle"))}
          </p>
          <WizardProgress step="5" documentType={type} onStepChange={onStepChange} />

          {templatesLoading ? (
            <div className="mb-4 space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : remarkTemplates.length === 0 ? (
            <div className="mb-4 rounded-xl border border-dashed border-border-strong bg-surface-raised p-4">
              <p className="text-sm text-muted-foreground">
                {t("documentTermsForm.noRemarkTemplates")}{" "}
                <Link
                  to="/documents/library/business"
                  className="text-caption hover:text-muted-foreground duration-fast"
                >
                  {t("documentTermsForm.setUpRemarksInLibrary")}
                </Link>
                .
              </p>
            </div>
          ) : (
            <form.Subscribe selector={(s) => s.values.remarkTemplateId}>
              {(remarkTemplateId) => (
                <div className="mb-4">
                  <Select
                    value={remarkTemplateId ?? "__none__"}
                    onValueChange={handleRemarkTemplateSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("documentTermsForm.selectRemarkTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("documentTermsForm.none")}</SelectItem>
                      {remarkTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                          {template.defaultFor.includes(type)
                            ? ` ${t("wizardForm.default")}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Link
                    to="/documents/library/business"
                    className="inline-block mt-1.5 text-caption hover:text-muted-foreground duration-fast text-xs"
                  >
                    {t("documentTermsForm.manageRemarkTemplates")}
                  </Link>
                </div>
              )}
            </form.Subscribe>
          )}

          <FieldInput
            label={t(documentTypeLabelKey(type, "numberLabel"))}
            placeholder={t("documentTermsForm.numberPlaceholder")}
            value={documentNumber ?? ""}
            readOnly
          />

          <form.Subscribe
            selector={(s) => ({
              projectId: s.values.projectId,
              type: s.values.type,
            })}
          >
            {({ projectId, type: docType }) => {
              const projectRequired = docType === "INV" || docType === "RC";
              const selectValue =
                projectId ?? (projectRequired ? undefined : "__none__");

              return (
                <div className="flex items-center h-[52px] border-b border-dashed border-border-strong mb-0 gap-4">
                  <span className="text-sm font-medium whitespace-nowrap shrink-0 text-ink">
                    {t("documentTermsForm.project")}
                    {projectRequired ? " *" : ""}
                  </span>
                  <div className="flex-1 flex justify-end">
                    <Select
                      value={selectValue}
                      onValueChange={(v) =>
                        form.setFieldValue(
                          "projectId",
                          v === "__none__" ? null : v,
                        )
                      }
                    >
                      <SelectTrigger className="border-0 shadow-none h-auto py-1 text-sm text-right justify-end gap-1 focus:ring-0 bg-transparent">
                        <SelectValue
                          placeholder={
                            projectRequired
                              ? t("documentTermsForm.selectProject")
                              : t("documentTermsForm.none")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!projectRequired && (
                          <SelectItem value="__none__">
                            {t("documentTermsForm.none")}
                          </SelectItem>
                        )}
                        {activeProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            }}
          </form.Subscribe>

          <form.Field name="issueDate">
            {(field) => (
              <DatePicker
                label={t("documentTermsForm.issueDate")}
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
              />
            )}
          </form.Field>

          <form.Subscribe selector={(s) => s.values.issueDate}>
            {(issueDate) => (
              <form.Field name="dueDate">
                {(field) => (
                  <DatePicker
                    label={t("documentTermsForm.dueDate")}
                    value={field.state.value}
                    min={issueDate}
                    onChange={(v) => field.handleChange(v)}
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Subscribe selector={(s) => s.values.isRecurring}>
            {(isRecurring) => (
              <>
                <div className="flex items-center justify-between h-[52px] border-b border-dashed border-border-strong mb-0">
                  <Label
                    className="text-sm font-medium normal-case tracking-normal text-foreground cursor-pointer"
                    htmlFor="recurring-toggle"
                  >
                    {t("documentTermsForm.recurring")}
                  </Label>
                  <Switch
                    id="recurring-toggle"
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      form.setFieldValue("isRecurring", checked);
                      if (!checked)
                        form.setFieldValue("recurringInterval", null);
                      else if (!form.getFieldValue("recurringInterval"))
                        form.setFieldValue("recurringInterval", "monthly");
                    }}
                    size="sm"
                  />
                </div>

                {isRecurring && (
                  <form.Field name="recurringInterval">
                    {(field) => (
                      <div className="flex items-center h-[52px] border-b border-dashed border-border-strong mb-0 gap-4">
                        <span className="text-sm font-medium whitespace-nowrap shrink-0 text-ink">
                          {t("documentTermsForm.repeats")}
                        </span>
                        <div className="flex-1 flex justify-end">
                          <Select
                            value={field.state.value ?? "monthly"}
                            onValueChange={(v) =>
                              field.handleChange(
                                v as "monthly" | "quarterly" | "yearly",
                              )
                            }
                          >
                            <SelectTrigger className="border-0 shadow-none h-auto py-1 text-sm text-right justify-end gap-1 focus:ring-0 bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">
                                {t("documentTermsForm.monthly")}
                              </SelectItem>
                              <SelectItem value="quarterly">
                                {t("documentTermsForm.quarterly")}
                              </SelectItem>
                              <SelectItem value="yearly">
                                {t("documentTermsForm.yearly")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </form.Field>
                )}
              </>
            )}
          </form.Subscribe>
        </div>
      )}
    </form.Subscribe>
  );
}
