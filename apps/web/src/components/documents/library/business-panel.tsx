import { RemarkTemplatesPanel } from "@/components/documents/library/remark-templates-panel";
import { SenderProfileDetail } from "@/components/documents/library/sender-profile-detail";
import { uploadSenderProfileImage } from "@/lib/upload-document-image";
import {
  effectiveCompanyAddress,
  emptyProfileForm,
  InlineError,
  SenderProfileFields,
  type SenderProfileForm,
} from "@/components/documents/library/sender-profile-fields";
import type { SenderProfile } from "@/components/documents/wizard/document-wizard-state";
import { IdCard, Loader2, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { client, expectEden, expectEdenVoid } from "@/lib/eden";
import {
  appendListOrderId,
  captureListOrder,
  flipDefaultInList,
  removeListOrderId,
} from "@/lib/business-list-order";
import { invalidateSenderProfiles } from "@/lib/invalidate-helpers";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-base font-semibold text-foreground">{title}</h3>;
}

function SenderProfileTab({
  profile,
  selected,
  onSelect,
}: {
  profile: SenderProfile;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation("documents");

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={
        profile.isDefault
          ? `${profile.name} (${t("businessPanel.default")})`
          : profile.name
      }
      onClick={onSelect}
      className={cn(
        "h-9 max-w-[10rem] shrink-0 truncate rounded-lg border px-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        profile.isDefault ? "border-primary-border" : "border-border-subtle",
        selected
          ? "bg-surface-raised text-foreground"
          : "bg-surface-card text-muted-foreground hover:text-foreground",
        !profile.isDefault && !selected && "hover:border-border-default",
      )}
    >
      {profile.name}
    </button>
  );
}

function NewSenderProfileCard({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("documents");
  const [form, setForm] = useState<SenderProfileForm>(emptyProfileForm());
  const [error, setError] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingSignature, setPendingSignature] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async (data: SenderProfileForm) =>
      expectEden(
        await client.api.business.senderProfiles.post({
          name: data.name,
          entityType: data.entityType,
          defaultDueDaysOffset: Number(data.defaultDueDaysOffset),
          defaultDueDaysQo: data.defaultDueDaysQo,
          defaultDueDaysRc: data.defaultDueDaysRc,
          vatRegistered: data.vatRegistered,
          etaxEnabled: data.etaxEnabled,
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
    onSuccess: async (row) => {
      setError(null);
      if (!row?.id) return;
      // Images upload after create — the profile id doesn't exist until now.
      await Promise.all([
        pendingLogo
          ? uploadSenderProfileImage(row.id, "logo", pendingLogo).catch(
              () => null,
            )
          : null,
        pendingSignature
          ? uploadSenderProfileImage(
              row.id,
              "signature",
              pendingSignature,
            ).catch(() => null)
          : null,
      ]);
      onCreated(row.id);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : t("businessPanel.failedToCreateProfile"),
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <SenderProfileFields
          form={form}
          idPrefix="new-sp"
          autoFocus
          set={set}
          onLogoPending={setPendingLogo}
          onSignaturePending={setPendingSignature}
        />

        {error && <InlineError message={error} />}
      </div>

      <div className="drawer-footer">
        <button
          type="button"
          onClick={onCancel}
          disabled={create.isPending}
          className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
        >
          {t("businessPanel.cancel")}
        </button>
        <button
          type="button"
          onClick={() => create.mutate(form)}
          disabled={!form.name.trim() || create.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
        >
          {create.isPending && <Loader2 size={13} className="animate-spin" />}
          {t("businessPanel.createProfile")}
        </button>
      </div>
    </div>
  );
}

function SenderProfilesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-lg" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5 sm:px-5 sm:py-4">
          <Skeleton className="h-5 w-36" />
          <div className="flex gap-2">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-x-12 px-4 py-3 sm:grid-cols-2 sm:px-5">
          {Array.from({ length: 13 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-border-subtle py-3"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BusinessPanel({
  autoAddProfile,
}: {
  autoAddProfile?: boolean;
}) {
  const { t } = useTranslation("documents");
  const qc = useQueryClient();
  const [addingProfile, setAddingProfile] = useState(!!autoAddProfile);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );

  const {
    data: profiles = [],
    isLoading: profilesLoading,
    isError: profilesError,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: queryKeys.senderProfiles,
    queryFn: async () => {
      const rows = expectEden(await client.api.business.senderProfiles.get());
      return captureListOrder(qc, queryKeys.senderProfilesOrder, rows);
    },
  });

  const setDefaultProfile = useMutation({
    mutationFn: async (id: string) =>
      expectEdenVoid(
        await client.api.business.senderProfiles({ id }).setDefault.post(),
      ),
    onMutate: (id: string) => {
      const prev = qc.getQueryData<SenderProfile[]>(queryKeys.senderProfiles);
      if (prev) {
        qc.setQueryData(queryKeys.senderProfiles, flipDefaultInList(prev, id));
      }
      return { prev };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<SenderProfile[]>(queryKeys.senderProfiles, (current) =>
        current ? flipDefaultInList(current, id) : current,
      );
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.senderProfiles, context.prev);
      }
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) =>
      expectEdenVoid(await client.api.business.senderProfiles({ id }).delete()),
    onSuccess: (_data, id) => {
      removeListOrderId(qc, queryKeys.senderProfilesOrder, id);
      void invalidateSenderProfiles(qc);
    },
  });

  const handleProfileSaved = useCallback(() => {
    void invalidateSenderProfiles(qc);
  }, [qc]);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ??
    profiles.find((profile) => profile.isDefault) ??
    profiles[0];
  const defaultProfileCount = profiles.filter(
    (profile) => profile.isDefault,
  ).length;

  return (
    <>
      <div className="space-y-10">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <SectionHeader
                title={t("businessPanel.sectionSenderProfilesTitle")}
              />
              {!profilesLoading && !profilesError && profiles.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("businessPanel.profileCount", {
                    count: profiles.length,
                  })}
                  <span aria-hidden="true"> · </span>
                  {t("businessPanel.defaultProfileCount", {
                    count: defaultProfileCount,
                  })}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label={t("businessPanel.addProfile")}
              className="shrink-0 gap-1.5 max-xl:size-9 max-xl:px-0 xl:h-8"
              onClick={() => setAddingProfile(true)}
              disabled={addingProfile}
            >
              <Plus size={13} />
              <span className="hidden xl:inline">
                {t("businessPanel.addProfile")}
              </span>
            </Button>
          </div>

          {profilesLoading ? (
            <SenderProfilesSkeleton />
          ) : profilesError ? (
            <div className="space-y-2 rounded-xl border border-dashed border-danger/30 py-8 text-center">
              <p className="text-sm text-danger">
                {t("businessPanel.couldNotLoadProfiles")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchProfiles()}
              >
                {t("businessPanel.retry")}
              </Button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border-default bg-surface-raised/40 px-4 py-3.5 text-left">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-card text-muted-foreground">
                <IdCard size={18} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">
                  {t("businessPanel.noSenderProfilesYet")}
                </p>
                <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
                  {t("businessPanel.addOneToPrefillInvoices")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                role="tablist"
                aria-label={t("businessPanel.sectionSenderProfilesTitle")}
                className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {profiles.map((profile) => (
                  <SenderProfileTab
                    key={profile.id}
                    profile={profile}
                    selected={selectedProfile?.id === profile.id}
                    onSelect={() => setSelectedProfileId(profile.id)}
                  />
                ))}
              </div>
              {selectedProfile && (
                <SenderProfileDetail
                  key={selectedProfile.id}
                  profile={selectedProfile}
                  onSetDefault={(id) => setDefaultProfile.mutate(id)}
                  onDelete={(id) => setDeleteProfileId(id)}
                  onSaved={handleProfileSaved}
                />
              )}
            </div>
          )}
        </section>

        <section>
          <RemarkTemplatesPanel />
        </section>
      </div>

      <DeleteConfirmDialog
        open={!!deleteProfileId}
        onOpenChange={(open) => {
          if (!open) setDeleteProfileId(null);
        }}
        title={t("businessPanel.deleteProfileConfirmTitle")}
        description={t("businessPanel.deleteProfileConfirmDescription")}
        onConfirm={() => {
          if (deleteProfileId) deleteProfile.mutate(deleteProfileId);
          setDeleteProfileId(null);
        }}
      />

      <Dialog open={addingProfile} onOpenChange={setAddingProfile}>
        <DialogContent className="flex h-[min(85vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
            <DialogTitle className="font-semibold">
              {t("businessPanel.newSenderProfile")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("businessPanel.senderProfileDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <NewSenderProfileCard
            onCreated={(id) => {
              appendListOrderId(qc, queryKeys.senderProfilesOrder, id);
              setSelectedProfileId(id);
              setAddingProfile(false);
              void invalidateSenderProfiles(qc);
            }}
            onCancel={() => setAddingProfile(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
