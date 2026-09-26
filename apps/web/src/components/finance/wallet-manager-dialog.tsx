import {
  PAYMENT_METHOD_COLORS,
  walletLabel,
  walletLastFour,
} from "@/components/finance/constants";
import { WalletCard } from "@/components/finance/wallet-card";
import {
  WalletForm,
  type WalletFormValues,
} from "@/components/finance/wallet-form";
import type { Wallet } from "@/components/finance/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { ArrowLeft, Pencil, Plus, Trash2 } from "@/components/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface WalletManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Wallet[];
}

function toWalletPayload(payload: WalletFormValues) {
  return {
    name: walletLabel(payload),
    type: payload.type,
    lastFour: walletLastFour(payload) ?? undefined,
    color: PAYMENT_METHOD_COLORS[payload.type],
    isDefault: payload.isDefault,
    bankName: payload.bankName.trim() || undefined,
    accountNumber: payload.accountNumber.trim() || undefined,
    accountName: payload.accountName.trim() || undefined,
    swiftCode: payload.swiftCode.trim() || undefined,
    promptPayId: payload.promptPayId.trim() || undefined,
    cardNumber: payload.cardNumber.trim() || undefined,
    cardExpiry: payload.cardExpiry.trim() || undefined,
    cardholderName: payload.cardholderName.trim() || undefined,
    showOnInvoice: payload.showOnInvoice,
    isDefaultInvoice: payload.isDefaultInvoice,
  };
}

export function WalletManagerDialog({
  open,
  onOpenChange,
  wallets,
}: WalletManagerDialogProps) {
  const { t } = useTranslation("accounting");
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: async (payload: WalletFormValues) => {
      const result = await client.api.wallets.post(toWalletPayload(payload));
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: WalletFormValues;
    }) => {
      const result = await client.api
        .wallets({ id })
        .patch(toWalletPayload(payload));
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await client.api.wallets({ id }).delete();
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      setDeletingId(null);
    },
  });

  const editingWallet = wallets.find((w) => w.id === editingId);
  const inFormView = showAddForm || Boolean(editingWallet);

  const closeForm = () => {
    setShowAddForm(false);
    setEditingId(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          onOpenChange(o);
          if (!o) closeForm();
        }}
      >
        <DialogContent className="flex h-[min(85vh,680px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              {inFormView && (
                <button
                  type="button"
                  aria-label={t("walletManager.back")}
                  onClick={closeForm}
                  className="-ml-1 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-surface-raised hover:text-foreground"
                >
                  <ArrowLeft size={14} strokeWidth={2} />
                </button>
              )}
              <DialogTitle className="font-semibold">
                {showAddForm
                  ? t("walletManager.addWallet")
                  : editingWallet
                    ? t("walletManager.editAria")
                    : t("walletManager.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              {t("walletManager.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            {showAddForm ? (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <WalletForm
                  isFirstWallet={wallets.length === 0}
                  isPending={addMutation.isPending}
                  onCancel={closeForm}
                  onSubmit={(values) => addMutation.mutate(values)}
                />
              </motion.div>
            ) : editingWallet ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <WalletForm
                  initialData={editingWallet}
                  isFirstWallet={false}
                  isPending={updateMutation.isPending}
                  onCancel={closeForm}
                  onSubmit={(values) =>
                    updateMutation.mutate({ id: editingWallet.id, payload: values })
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
              >
                <div className="grid grid-cols-2 gap-4">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="group relative">
                    <WalletCard size="lg" wallet={wallet} />
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label={t("walletManager.editAria")}
                        onClick={() => setEditingId(wallet.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/30 backdrop-blur-sm transition-colors hover:bg-black/45"
                      >
                        <Pencil size={12} className="text-white" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("walletManager.deleteAria")}
                        onClick={() => setDeletingId(wallet.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/30 backdrop-blur-sm transition-colors hover:bg-destructive/70"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full aspect-[1.586] rounded-2xl border border-dashed border-border-strong flex flex-col items-center justify-center gap-1.5 text-muted-foreground transition-all duration-base hover:bg-surface-raised hover:text-foreground"
                >
                  <Plus size={18} strokeWidth={2} />
                  <span className="text-sm font-medium">
                    {t("walletManager.addWallet")}
                  </span>
                </button>

                {wallets.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground py-2">
                    {t("walletManager.emptyState")}
                  </p>
                )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent className="border border-border-subtle bg-surface-card sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("walletManager.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("walletManager.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("walletManager.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              {t("walletManager.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
