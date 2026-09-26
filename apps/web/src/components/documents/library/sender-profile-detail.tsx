import {
  DUE_DAYS_FIELDS,
  effectiveCompanyAddress,
  formsEqual,
  InlineError,
  profileToForm,
  SenderProfileFields,
  type SenderProfileForm,
} from "@/components/documents/library/sender-profile-fields";
import type { SenderProfile } from "@/components/documents/wizard/document-wizard-state";
import {
  FileSignature,
  ImageIcon,
  Loader2,
  Pencil,
  Star,
  Trash2,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { client, expectEden } from "@/lib/eden";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

type ProfileSummaryRow = {
  label: string;
  value: string;
  multiline?: boolean;
  tabular?: boolean;
};

export function SenderProfileDetail({
  profile,
  onSetDefault,
  onDelete,
  onSaved,
}: {
  profile: SenderProfile;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation("documents");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SenderProfileForm>(profileToForm(profile));
  const [error, setError] = useState<string | null>(null);

  const original = profileToForm(profile);
  const isDirty = !formsEqual(form, original);

  const patch = useMutation({
    mutationFn: async (data: SenderProfileForm) =>
      expectEden(
        await client.api.business.senderProfiles({ id: profile.id }).patch({
          name: data.name,
          entityType: data.entityType,
          vatRegistered: data.vatRegistered,
          etaxEnabled: data.etaxEnabled,
          defaultDueDaysOffset: Number(data.defaultDueDaysOffset),
          defaultDueDaysQo: data.defaultDueDaysQo,
          defaultDueDaysRc: data.defaultDueDaysRc,
          registeredName: data.registeredName || undefined,
          registeredNameEn: data.registeredNameEn || undefined,
          yourEmail: data.yourEmail || undefined,
          yourPhone: data.yourPhone || undefined,
          yourAddress: data.yourAddress || undefined,
          yourAddressEn: data.yourAddressEn || undefined,
          yourAddressZip: data.yourAddressZip || undefined,
          yourAddressCountry: data.yourAddressCountry || undefined,
          useSameAddressForCompany: data.useSameAddressForCompany,
          ...effectiveCompanyAddress(data),
          yourBranchNumber: data.yourBranchNumber || undefined,
          yourTaxId: data.yourTaxId || undefined,
          defaultTaxRateBps: Number(data.defaultTaxRateBps),
          defaultRemark: data.defaultRemark || undefined,
        }),
      ),
    onSuccess: () => {
      setError(null);
      setDialogOpen(false);
      onSaved();
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : t("businessPanel.failedToSaveProfile"),
      );
    },
  });

  const set = useCallback(
    <K extends keyof SenderProfileForm>(
      key: K,
      value: SenderProfileForm[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleCancel = () => {
    setForm(original);
    setError(null);
    setDialogOpen(false);
  };

  const ratePct = (bps: number) => (bps / 100).toString();
  // Every profile renders the same fixed row set ("—" when empty) so cards
  // keep a static height when switching between profile tabs.
  const summaryRows: ProfileSummaryRow[] = [
    {
      label: t("businessPanel.registeredName"),
      value: profile.registeredName || profile.registeredNameEn || profile.name,
    },
    {
      label: t("businessPanel.englishNameOptional"),
      value: profile.registeredNameEn || "—",
    },
    {
      label: t("businessPanel.taxId"),
      value: profile.yourTaxId || "—",
      tabular: true,
    },
    {
      label: t("businessPanel.branchNumber"),
      value: profile.yourBranchNumber || "—",
      tabular: true,
    },
    {
      label: t("businessPanel.email"),
      value: profile.yourEmail || "—",
    },
    {
      label: t("businessPanel.phone"),
      value: profile.yourPhone || "—",
      tabular: true,
    },
    {
      label: t("businessPanel.registeredAddress"),
      value: profile.registeredAddress || "—",
      multiline: true,
    },
    {
      label: t("businessPanel.englishAddressOptional"),
      value: profile.registeredAddressEn || "—",
      multiline: true,
    },
    {
      label: t("businessPanel.country"),
      value:
        [profile.yourCountry, profile.yourZip].filter(Boolean).join(" ") || "—",
    },
    {
      label: t("businessPanel.defaultRemark"),
      value: profile.defaultRemark || "—",
      multiline: true,
    },
    {
      label: t("businessPanel.paymentTerms"),
      value: DUE_DAYS_FIELDS.map(({ field, labelKey }) => {
        const days = profile[field];
        return `${t(labelKey)}: ${days == null ? "—" : `Net ${days}`}`;
      }).join(" · "),
    },
    {
      label: t("businessPanel.vatRegistered"),
      value: profile.vatRegistered
        ? `${ratePct(profile.defaultTaxRateBps)}%`
        : t("businessPanel.vatNo"),
      tabular: profile.vatRegistered,
    },
    {
      label: t("businessPanel.etaxTitle"),
      value: profile.etaxEnabled
        ? t("businessPanel.etaxOn")
        : t("businessPanel.etaxOff"),
    },
  ];

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-card",
          profile.isDefault ? "border-primary-border" : "border-border-subtle",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="truncate text-lg font-medium text-foreground">
              {profile.name}
            </span>
            {profile.vatRegistered && (
              <Badge variant="soft" size="pill-sm">
                VAT
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onSetDefault(profile.id)}
              disabled={profile.isDefault}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-2xs text-muted-foreground transition-colors duration-fast hover:bg-surface-raised hover:text-foreground disabled:hidden"
            >
              <Star size={12} />
              {t("businessPanel.setDefault")}
            </button>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t("businessPanel.edit")}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(profile.id)}
              className="rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t("businessPanel.deleteProfile")}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <dl className="grid gap-x-12 px-4 py-3 text-xs sm:grid-cols-2 sm:px-5">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="flex min-w-0 items-start justify-between gap-4 border-b border-border-subtle py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
            >
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd
                className={`min-w-0 text-right text-foreground ${
                  row.multiline ? "whitespace-pre-line" : "truncate"
                } ${row.tabular ? "tabular-nums" : ""}`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-end gap-4 border-t border-border-subtle px-4 py-3 sm:px-5">
          <figure className="min-w-0">
            {profile.yourLogo ? (
              <img
                src={profile.yourLogo}
                alt={t("businessPanel.logo")}
                className="h-12 w-20 rounded-md border border-border-subtle bg-surface-raised object-contain p-1"
              />
            ) : (
              <div className="flex h-12 w-20 items-center justify-center rounded-md border border-dashed border-border-subtle text-muted-foreground/50">
                <ImageIcon size={16} strokeWidth={1.5} />
              </div>
            )}
            <figcaption className="mt-1 text-2xs text-caption">
              {t("businessPanel.logo")}
            </figcaption>
          </figure>
          <figure className="min-w-0">
            {profile.signatureImage ? (
              <img
                src={profile.signatureImage}
                alt={t("businessPanel.signature")}
                className="h-12 w-20 rounded-md border border-border-subtle bg-surface-raised object-contain p-1"
              />
            ) : (
              <div className="flex h-12 w-20 items-center justify-center rounded-md border border-dashed border-border-subtle text-muted-foreground/50">
                <FileSignature size={16} strokeWidth={1.5} />
              </div>
            )}
            <figcaption className="mt-1 text-2xs text-caption">
              {t("businessPanel.signature")}
            </figcaption>
          </figure>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) setDialogOpen(true);
          else if (!patch.isPending) handleCancel();
        }}
      >
        <DialogContent className="flex h-[min(85vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
            <DialogTitle className="font-semibold">
              {t("businessPanel.editSenderProfile")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("businessPanel.senderProfileDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
            <SenderProfileFields
              form={form}
              idPrefix={`sp-${profile.id}`}
              autoFocus
              set={set}
              profileId={profile.id}
              etaxFromEmail={profile.etaxFromEmail ?? undefined}
            />

            {error && <InlineError message={error} />}
          </div>

          <div className="drawer-footer">
            <button
              type="button"
              onClick={handleCancel}
              disabled={patch.isPending}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("businessPanel.cancel")}
            </button>
            <button
              type="button"
              onClick={() => patch.mutate(form)}
              disabled={!isDirty || !form.name.trim() || patch.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            >
              {patch.isPending && (
                <Loader2 size={13} className="animate-spin" />
              )}
              {t("businessPanel.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
