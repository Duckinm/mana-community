import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { FieldInput } from "@/components/documents/ui/field-input";
import type { SenderProfile, WizardForm } from "@/components/documents/wizard/document-wizard-state";
import { applyProfileToForm } from "@/components/documents/wizard/document-wizard-state";
import { WizardProgress } from "@/components/documents/wizard/wizard-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSenderProfiles } from "@/hooks/use-sender-profiles";
import { useStore } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface YourDetailsFormProps {
  form: WizardForm;
  onStepChange: (step: string) => void;
}

export function YourDetailsForm({ form, onStepChange }: YourDetailsFormProps) {
  const documentType = useStore(form.store, (s) => s.values.type);
  const { senderProfiles, isLoading, isFetching, isError, refetch, defaultProfile } = useSenderProfiles();
  const { t } = useTranslation("documents");

  useEffect(() => {
    if (isFetching) return;
    if (defaultProfile && !form.getFieldValue("senderProfileId")) {
      applyProfileToForm(form, defaultProfile);
    }
  }, [defaultProfile, isFetching, form]);

  function handleProfileSelect(id: string) {
    if (id === "__none__") {
      form.setFieldValue("senderProfileId", null);
      return;
    }
    const profile = senderProfiles.find((p: SenderProfile) => p.id === id);
    if (profile) applyProfileToForm(form, profile);
  }

  return (
    <div>
      <p className="pb-3 text-2xl font-semibold">{t("wizardForm.yourDetailsTitle")}</p>
      <WizardProgress step="1" documentType={documentType} onStepChange={onStepChange} />

      {isError ? (
        <QueryErrorPanel onRetry={() => void refetch()} className="mb-4 py-4" />
      ) : isLoading ? (
        <div className="space-y-2 mb-4">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : senderProfiles.length === 0 ? (
        <div className="mb-4 rounded-xl border border-dashed border-border-strong bg-surface-raised p-4">
          <p className="text-sm text-muted-foreground">
            {t("wizardForm.noSenderProfiles")}{" "}
            <Link
              to="/documents/library/business"
              search={{ newProfile: true }}
              className="text-caption hover:text-muted-foreground duration-fast"
            >
              {t("wizardForm.setOneUpIn")}
            </Link>
            .
          </p>
        </div>
      ) : (
        <form.Subscribe selector={(s) => s.values.senderProfileId}>
          {(senderProfileId) => (
            <div className="mb-4">
              <Select
                value={senderProfileId ?? "__none__"}
                onValueChange={handleProfileSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("wizardForm.selectSenderProfile")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("wizardForm.selectSenderProfile")}
                  </SelectItem>
                  {senderProfiles.map((p: SenderProfile) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.isDefault ? ` ${t("wizardForm.default")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link
                to="/documents/library/business"
                className="inline-block mt-1.5 text-caption hover:text-muted-foreground duration-fast text-xs"
              >
                {t("wizardForm.manageProfiles")}
              </Link>
            </div>
          )}
        </form.Subscribe>
      )}

      <form.Subscribe selector={(s) => s.values.vatRegistered}>
        {(vatRegistered) => (
          <>
            <div className="flex items-center justify-between h-[52px] border-b border-dashed border-border-strong mb-0">
              <Label
                className="text-sm font-medium normal-case tracking-normal text-foreground cursor-pointer"
                htmlFor="your-vat-toggle"
              >
                {t("wizardForm.vatRegistered")}
              </Label>
              <Switch
                id="your-vat-toggle"
                checked={vatRegistered}
                onCheckedChange={(checked) => {
                  form.setFieldValue("vatRegistered", checked);
                  form.setFieldValue("taxRateBps", checked ? 700 : 0);
                }}
                size="sm"
              />
            </div>

            <form.Field name="registeredName">
              {(field) => (
                <FieldInput
                  label={
                    vatRegistered
                      ? t("wizardForm.registeredName")
                      : t("wizardForm.fullName")
                  }
                  placeholder={
                    vatRegistered
                      ? t("businessPanel.registeredNamePlaceholder")
                      : t("wizardForm.fullNamePlaceholder")
                  }
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            {vatRegistered && (
              <form.Field name="registeredNameEn">
                {(field) => (
                  <FieldInput
                    label={t("wizardForm.englishName")}
                    placeholder={t("businessPanel.englishNamePlaceholder")}
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            <form.Field name="yourEmail">
              {(field) => (
                <FieldInput
                  label={t("wizardForm.email")}
                  type="email"
                  placeholder="jane@example.com"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field name="yourPhone">
              {(field) => (
                <FieldInput
                  label={t("wizardForm.phone")}
                  type="tel"
                  placeholder="+66 81 234 5678"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field name="registeredAddress">
              {(field) => (
                <FieldInput
                  label={
                    vatRegistered
                      ? t("wizardForm.registeredAddress")
                      : t("wizardForm.address")
                  }
                  placeholder={t("businessPanel.registeredAddressPlaceholder")}
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            {vatRegistered && (
              <form.Field name="registeredAddressEn">
                {(field) => (
                  <FieldInput
                    label={t("wizardForm.englishAddress")}
                    placeholder={t("businessPanel.englishAddressPlaceholder")}
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            {vatRegistered && (
              <form.Field name="yourTaxId">
                {(field) => (
                  <FieldInput
                    label={t("wizardForm.taxId")}
                    placeholder="0123456789012"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            {vatRegistered && (
              <form.Field name="yourBranchNumber">
                {(field) => (
                  <FieldInput
                    label={t("wizardForm.branch")}
                    placeholder="00000"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            <form.Field name="yourZip">
              {(field) => (
                <FieldInput
                  label={t("wizardForm.zip")}
                  placeholder="10110"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field name="yourCountry">
              {(field) => (
                <FieldInput
                  label={t("wizardForm.country")}
                  placeholder={t("businessPanel.countryPlaceholder")}
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </>
        )}
      </form.Subscribe>
    </div>
  );
}
