import { AddressLabelField } from "@/components/contacts/address-label-field";
import { EntityTypeToggle } from "@/components/contacts/entity-type-toggle";
import type { EntityType } from "@/components/contacts/contact-schema";
import { ImageUploadField } from "@/components/documents/library/image-upload-field";
import { PAYMENT_TERM_PRESETS } from "@/components/documents/promotion/promotion-schema";
import type { SenderProfile } from "@/components/documents/wizard/document-wizard-state";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Check, Copy, Minus, Plus } from "@/components/icons";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  removeSenderProfileImage,
  uploadSenderProfileImage,
} from "@/lib/upload-document-image";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const DUE_DAYS_FIELDS = [
  { field: "defaultDueDaysQo", labelKey: "typeQuotation", nullable: true },
  { field: "defaultDueDaysOffset", labelKey: "typeInvoice", nullable: false },
  { field: "defaultDueDaysRc", labelKey: "typeReceipt", nullable: true },
] as const;

function DueDaysChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-base",
        active
          ? "border-primary-border bg-primary-soft text-primary"
          : "border-border-subtle bg-surface-input text-muted-foreground hover:border-border-default hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export type SenderProfileForm = {
  name: string;
  entityType: EntityType;
  defaultDueDaysOffset: number;
  defaultDueDaysQo: number | null;
  defaultDueDaysRc: number | null;
  defaultRemark: string;
  vatRegistered: boolean;
  etaxEnabled: boolean;
  registeredName: string;
  registeredNameEn: string;
  yourEmail: string;
  yourPhone: string;
  yourAddress: string;
  yourAddressEn: string;
  yourAddressZip: string;
  yourAddressCountry: string;
  useSameAddressForCompany: boolean;
  registeredAddress: string;
  registeredAddressEn: string;
  yourBranchNumber: string;
  yourCountry: string;
  yourZip: string;
  yourTaxId: string;
  yourLogo: string;
  signatureImage: string;
  defaultTaxRateBps: number;
};

export function emptyProfileForm(): SenderProfileForm {
  return {
    name: "",
    entityType: "individual",
    defaultDueDaysOffset: 30,
    defaultDueDaysQo: null,
    defaultDueDaysRc: null,
    defaultRemark: "",
    vatRegistered: false,
    etaxEnabled: false,
    registeredName: "",
    registeredNameEn: "",
    yourEmail: "",
    yourPhone: "",
    yourAddress: "",
    yourAddressEn: "",
    yourAddressZip: "",
    yourAddressCountry: "",
    useSameAddressForCompany: true,
    registeredAddress: "",
    registeredAddressEn: "",
    yourBranchNumber: "",
    yourCountry: "",
    yourZip: "",
    yourTaxId: "",
    yourLogo: "",
    signatureImage: "",
    defaultTaxRateBps: 0,
  };
}

export function profileToForm(p: SenderProfile): SenderProfileForm {
  return {
    name: p.name,
    entityType: (p.entityType as EntityType) ?? "individual",
    defaultDueDaysOffset: p.defaultDueDaysOffset ?? 30,
    defaultDueDaysQo: p.defaultDueDaysQo ?? null,
    defaultDueDaysRc: p.defaultDueDaysRc ?? null,
    defaultRemark: p.defaultRemark ?? "",
    vatRegistered: p.vatRegistered ?? false,
    etaxEnabled: p.etaxEnabled ?? false,
    registeredName: p.registeredName ?? "",
    registeredNameEn: p.registeredNameEn ?? "",
    yourEmail: p.yourEmail ?? "",
    yourPhone: p.yourPhone ?? "",
    yourAddress: p.yourAddress ?? "",
    yourAddressEn: p.yourAddressEn ?? "",
    yourAddressZip: p.yourAddressZip ?? "",
    yourAddressCountry: p.yourAddressCountry ?? "",
    useSameAddressForCompany: p.useSameAddressForCompany ?? true,
    registeredAddress: p.registeredAddress ?? "",
    registeredAddressEn: p.registeredAddressEn ?? "",
    yourBranchNumber: p.yourBranchNumber ?? "",
    yourCountry: p.yourCountry ?? "",
    yourZip: p.yourZip ?? "",
    yourTaxId: p.yourTaxId ?? "",
    yourLogo: p.yourLogo ?? "",
    signatureImage: p.signatureImage ?? "",
    // Not VAT-registered means no right to charge VAT — force the rate to 0.
    defaultTaxRateBps: p.vatRegistered ? (p.defaultTaxRateBps ?? 700) : 0,
  };
}

export function effectiveCompanyAddress(form: SenderProfileForm) {
  if (!form.useSameAddressForCompany) {
    return {
      registeredAddress: form.registeredAddress,
      registeredAddressEn: form.registeredAddressEn,
      yourZip: form.yourZip,
      yourCountry: form.yourCountry,
    };
  }
  return {
    registeredAddress: form.yourAddress,
    registeredAddressEn: form.yourAddressEn,
    yourZip: form.yourAddressZip,
    yourCountry: form.yourAddressCountry,
  };
}

export function formsEqual<T extends object>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-danger-soft border border-danger/20 px-3 py-2.5 text-xs text-danger">
      <AlertCircle size={13} className="shrink-0" />
      {message}
    </div>
  );
}

function RateStepper({
  label,
  value,
  onChange,
  stepBps,
  maxBps,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (bps: number) => void;
  stepBps: number;
  maxBps: number;
  disabled?: boolean;
}) {
  const { t } = useTranslation("documents");
  const stepperButton =
    "flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="flex items-center gap-2 h-10">
      <Label className="mb-0 shrink-0">{label}</Label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={t("businessPanel.rateDecrease")}
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - stepBps))}
          className={stepperButton}
        >
          <Minus size={12} />
        </button>
        <span
          className={cn(
            "w-14 text-center font-mono text-sm tabular-nums",
            disabled ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {value / 100}%
        </span>
        <button
          type="button"
          aria-label={t("businessPanel.rateIncrease")}
          disabled={disabled || value >= maxBps}
          onClick={() => onChange(Math.min(maxBps, value + stepBps))}
          className={stepperButton}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

function EtaxFromEmailRow({ email }: { email: string }) {
  const { t } = useTranslation("documents");
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-input px-3 py-2.5">
      <span className="truncate font-mono text-xs text-foreground">
        {email}
      </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(email);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? t("businessPanel.etaxCopied") : t("businessPanel.etaxCopy")}
      </button>
    </div>
  );
}

function EtaxSection({
  enabled,
  onToggle,
  etaxFromEmail,
  idPrefix,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  etaxFromEmail?: string;
  idPrefix: string;
}) {
  const { t } = useTranslation("documents");

  return (
    <div className="space-y-3 rounded-xl border border-border-subtle p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-etax`} className="mb-0.5">
            {t("businessPanel.etaxTitle")}
          </Label>
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {t("businessPanel.etaxDescription")}
          </p>
        </div>
        <Switch
          id={`${idPrefix}-etax`}
          checked={enabled}
          onCheckedChange={onToggle}
          size="sm"
        />
      </div>

      {enabled && (
        <div className="space-y-3 border-t border-border-subtle pt-3">
          {etaxFromEmail ? (
            <EtaxFromEmailRow email={etaxFromEmail} />
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("businessPanel.etaxAddressPendingSave")}
            </p>
          )}

          <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
            <li>
              {t("businessPanel.etaxStep1")}{" "}
              <a
                href="https://interapp3.rd.go.th/signed_inter/src_inter/main2.php"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {t("businessPanel.etaxStepLink")}
              </a>
            </li>
            <li>{t("businessPanel.etaxStep2")}</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export function SenderProfileFields({
  form,
  idPrefix,
  autoFocus,
  set,
  profileId,
  etaxFromEmail,
  onLogoPending,
  onSignaturePending,
}: {
  form: SenderProfileForm;
  idPrefix: string;
  autoFocus?: boolean;
  set: <K extends keyof SenderProfileForm>(
    key: K,
    value: SenderProfileForm[K],
  ) => void;
  /** Present in edit mode → upload immediately. Absent in create → hold pending. */
  profileId?: string;
  /** Per-user e-Tax sending address — only available once the profile exists. */
  etaxFromEmail?: string;
  onLogoPending?: (file: File | null) => void;
  onSignaturePending?: (file: File | null) => void;
}) {
  const { t } = useTranslation("documents");

  return (
    <>
      <Input
        id={`${idPrefix}-name`}
        autoFocus={autoFocus}
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder={t("businessPanel.profileNamePlaceholder")}
        className={!form.name.trim() ? "border-danger/60" : ""}
      />

      <EntityTypeToggle
        value={form.entityType}
        onChange={(v) => set("entityType", v)}
      />

      <div className="space-y-2">
        <Label className="mb-0">{t("businessPanel.defaultDueDays")}</Label>
        {DUE_DAYS_FIELDS.map(({ field, labelKey, nullable }) => (
          <div key={field} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">
              {t(labelKey)}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {nullable && (
                <DueDaysChip
                  active={form[field] === null}
                  label={t("businessPanel.noDueDate")}
                  onClick={() => set(field, null)}
                />
              )}
              {PAYMENT_TERM_PRESETS.map((preset) => (
                <DueDaysChip
                  key={preset.id}
                  active={form[field] === preset.days}
                  label={t(`promotion.terms.${preset.id}`)}
                  onClick={() => set(field, preset.days)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Textarea
        id={`${idPrefix}-remark`}
        aria-label={t("businessPanel.defaultRemark")}
        value={form.defaultRemark}
        onChange={(e) => set("defaultRemark", e.target.value)}
        placeholder={t("businessPanel.defaultRemarkPlaceholder")}
        rows={3}
        className="resize-none"
      />

      {/* Individuals register for VAT too (ภ.พ.20), and only a VAT registrant may issue
          a tax invoice — so this gate is VAT registration, never entity type. */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2 h-10">
          <Switch
            checked={form.vatRegistered}
            onCheckedChange={(v) => {
              set("vatRegistered", v);
              // Off = no right to charge VAT (rate locked at 0); on unlocks at 7%.
              set("defaultTaxRateBps", v ? 700 : 0);
              // e-Tax by Email is a VAT-registrant scheme — its hidden opt-in must not survive
              if (!v) set("etaxEnabled", false);
            }}
            size="sm"
          />
          <span className="text-xs text-foreground">
            {t("businessPanel.vatRegistered")}
          </span>
        </div>
        <RateStepper
          label={t("businessPanel.defaultTaxRate")}
          value={form.defaultTaxRateBps}
          onChange={(bps) => set("defaultTaxRateBps", bps)}
          stepBps={100}
          maxBps={2000}
          disabled={!form.vatRegistered}
        />
      </div>

      {form.vatRegistered && (
        <EtaxSection
          idPrefix={idPrefix}
          enabled={form.etaxEnabled}
          onToggle={(v) => set("etaxEnabled", v)}
          etaxFromEmail={etaxFromEmail}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label={t(
            form.entityType === "company"
              ? "businessPanel.taxIdCompany"
              : "businessPanel.taxIdIndividual",
          )}
          htmlFor={`${idPrefix}-taxid`}
        >
          <Input
            id={`${idPrefix}-taxid`}
            value={form.yourTaxId}
            onChange={(e) => set("yourTaxId", e.target.value)}
            placeholder="0105XXXXXXXXX"
          />
        </FormField>
        {form.entityType === "company" && form.vatRegistered && (
          <FormField
            label={t("businessPanel.branchNumber")}
            htmlFor={`${idPrefix}-branch`}
          >
            <Input
              id={`${idPrefix}-branch`}
              value={form.yourBranchNumber}
              onChange={(e) => set("yourBranchNumber", e.target.value)}
              placeholder={t("businessPanel.branchNumberPlaceholder")}
            />
          </FormField>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label={t("businessPanel.registeredName")}
          htmlFor={`${idPrefix}-registered-name`}
        >
          <Input
            id={`${idPrefix}-registered-name`}
            value={form.registeredName}
            onChange={(e) => set("registeredName", e.target.value)}
            placeholder={t("businessPanel.registeredNamePlaceholder")}
          />
        </FormField>
        <FormField
          label={t("businessPanel.englishNameOptional")}
          htmlFor={`${idPrefix}-registered-name-en`}
        >
          <Input
            id={`${idPrefix}-registered-name-en`}
            value={form.registeredNameEn}
            onChange={(e) => set("registeredNameEn", e.target.value)}
            placeholder={t("businessPanel.englishNamePlaceholder")}
          />
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label={t("businessPanel.email")}
          htmlFor={`${idPrefix}-email`}
        >
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={form.yourEmail}
            onChange={(e) => set("yourEmail", e.target.value)}
            placeholder="billing@example.com"
          />
        </FormField>
        <FormField
          label={t("businessPanel.phone")}
          htmlFor={`${idPrefix}-phone`}
        >
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={form.yourPhone}
            onChange={(e) => set("yourPhone", e.target.value)}
            placeholder="+66 81 234 5678"
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("businessPanel.registeredAddress")}</Label>
        <AddressLabelField
          values={{
            address: form.yourAddressEn,
            addressTh: form.yourAddress,
            zip: form.yourAddressZip,
            country: form.yourAddressCountry,
          }}
          onChange={(patch) => {
            if (patch.address !== undefined)
              set("yourAddressEn", patch.address);
            if (patch.addressTh !== undefined)
              set("yourAddress", patch.addressTh);
            if (patch.zip !== undefined) set("yourAddressZip", patch.zip);
            if (patch.country !== undefined)
              set("yourAddressCountry", patch.country);
          }}
        />
      </div>

      {form.entityType === "company" && (
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={form.useSameAddressForCompany}
              onCheckedChange={(v) => set("useSameAddressForCompany", !!v)}
            />
            {t("businessPanel.useSameAddressForCompany")}
          </label>

          {!form.useSameAddressForCompany && (
            <div className="flex flex-col gap-1.5">
              <Label>{t("businessPanel.companyAddress")}</Label>
              <AddressLabelField
                values={{
                  address: form.registeredAddressEn,
                  addressTh: form.registeredAddress,
                  zip: form.yourZip,
                  country: form.yourCountry,
                }}
                onChange={(patch) => {
                  if (patch.address !== undefined)
                    set("registeredAddressEn", patch.address);
                  if (patch.addressTh !== undefined)
                    set("registeredAddress", patch.addressTh);
                  if (patch.zip !== undefined) set("yourZip", patch.zip);
                  if (patch.country !== undefined)
                    set("yourCountry", patch.country);
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3">
        <ImageUploadField
          label={t("businessPanel.logo")}
          imageUrl={form.yourLogo || null}
          hint={t("businessPanel.logoHint")}
          onUpload={
            profileId
              ? (file) => uploadSenderProfileImage(profileId, "logo", file)
              : undefined
          }
          onRemove={
            profileId
              ? () => removeSenderProfileImage(profileId, "logo")
              : undefined
          }
          onChange={(url) => set("yourLogo", url ?? "")}
          onPendingFileChange={onLogoPending}
        />
        <ImageUploadField
          label={t("businessPanel.signature")}
          imageUrl={form.signatureImage || null}
          hint={t("businessPanel.signatureHint")}
          contain
          aspectClassName="aspect-[21/9]"
          onUpload={
            profileId
              ? (file) => uploadSenderProfileImage(profileId, "signature", file)
              : undefined
          }
          onRemove={
            profileId
              ? () => removeSenderProfileImage(profileId, "signature")
              : undefined
          }
          onChange={(url) => set("signatureImage", url ?? "")}
          onPendingFileChange={onSignaturePending}
        />
      </div>
    </>
  );
}
