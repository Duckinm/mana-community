import { client, expectEdenVoid } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "@/components/icons";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const { t } = useTranslation("contacts");
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const count = selectedIds.length;

  async function handleBulkDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setLoading(true);
    try {
      expectEdenVoid(await client.api.contacts.bulk.delete({ ids: selectedIds }));
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(t("bulkActions.deletedCount", { count }));
      onClear();
    } catch {
      toast.error(t("bulkActions.deleteFailed"));
    } finally {
      setLoading(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-overlay border border-border-default shadow-modal"
        >
          <div className="flex items-center gap-2 mr-2 pr-2 border-r border-border-subtle">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {count}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("bulkActions.selected")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            disabled={loading}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              deleteConfirm
                ? "bg-danger-soft text-danger border border-danger/30"
                : "text-danger hover:bg-danger-soft"
            }`}
          >
            <Trash2 size={14} strokeWidth={2} />
            {loading ? t("bulkActions.deleting") : deleteConfirm ? t("bulkActions.confirm") : t("bulkActions.delete")}
          </button>

          <div className="w-px h-5 bg-border-subtle mx-1" />

          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            title={t("bulkActions.deselectAll")}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
