import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "@/components/icons";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface UploadFileProgress {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
}

interface Props {
  files: UploadFileProgress[];
  onDismiss: () => void;
}

export function UploadProgressPanel({ files, onDismiss }: Props) {
  const { t } = useTranslation("storage");
  const allDone =
    files.length > 0 && files.every((f) => f.status !== "uploading");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (allDone) {
      timerRef.current = setTimeout(onDismiss, 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [allDone, onDismiss]);

  return (
    <AnimatePresence>
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-30 rounded-2xl border border-border bg-surface-card p-3 shadow-modal sm:left-auto sm:right-6 sm:w-80 md:bottom-6 md:z-50"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-foreground">
              {allDone
                ? t("filesUploaded", { count: files.length })
                : t("uploading")}
            </p>
            <button
              onClick={onDismiss}
              className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-1.5">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-2.5 px-1">
                <div className="shrink-0">
                  {file.status === "done" && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check
                        size={9}
                        strokeWidth={2.5}
                        className="text-primary-foreground"
                      />
                    </div>
                  )}
                  {file.status === "error" && (
                    <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                      <X
                        size={9}
                        strokeWidth={2.5}
                        className="text-destructive-foreground"
                      />
                    </div>
                  )}
                  {file.status === "uploading" && (
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate text-foreground">
                    {file.name}
                  </p>
                  {file.status === "uploading" && (
                    <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )}
                  {file.status === "error" && (
                    <p className="text-[10px] text-destructive mt-0.5">
                      {t("uploadFailed")}
                    </p>
                  )}
                </div>

                {file.status === "uploading" && (
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {file.progress}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
