import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Upload, AlertTriangle } from "@/components/icons";
import { useStorageMutations } from "@/context/storage";
import { useStorageUploadGuard } from "@/hooks/use-storage-upload-guard";
import { isStorageQuotaError } from "@/lib/storage-quota";
import { cn } from "@/lib/utils";
import {
  UploadProgressPanel,
  type UploadFileProgress,
} from "@/components/storage/upload-progress-panel";
import { useTranslation } from "react-i18next";

export interface UploadDropzoneHandle {
  open: () => void;
}

function UploadDropzoneOverlay({
  roundedClassName,
  title,
  sub,
}: {
  roundedClassName?: string;
  title: string;
  sub: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 pointer-events-none",
        roundedClassName,
      )}
      style={{
        background: "var(--primary-soft)",
        border: "2px solid var(--primary-border)",
        backdropFilter: "blur(2px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary-border border border-primary-border">
          <Upload size={22} className="text-primary" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">{title}</p>
          <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface Props {
  folderId: string;
  children: React.ReactNode;
  className?: string;
  roundedClassName?: string;
  onUploaded?: (names: string[]) => void;
  onProgress?: (name: string, progress: number) => void;
  showQuotaBanner?: boolean;
}

export const UploadDropzone = forwardRef<UploadDropzoneHandle, Props>(
  function UploadDropzone(
    {
      folderId,
      children,
      className,
      roundedClassName,
      onUploaded,
      onProgress,
      showQuotaBanner = true,
    },
    ref,
  ) {
    const { t } = useTranslation("storage");
    const { addFile } = useStorageMutations();
    const { isFull, guardUpload, notifyBlocked } = useStorageUploadGuard();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [fileProgress, setFileProgress] = useState<UploadFileProgress[]>([]);
    const uploadSeq = useRef(0);

    const openPicker = useCallback(() => {
      inputRef.current?.click();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          guardUpload(openPicker);
        },
      }),
      [guardUpload, openPicker],
    );

    async function uploadSingleFile(file: File): Promise<void> {
      const uploadId = String(++uploadSeq.current);
      onProgress?.(file.name, 0);
      setFileProgress((prev) => [
        ...prev,
        { id: uploadId, name: file.name, progress: 0, status: "uploading" },
      ]);
      try {
        await addFile(file, folderId, undefined, undefined, (percent) => {
          onProgress?.(file.name, percent);
          setFileProgress((prev) =>
            prev.map((f) => (f.id === uploadId ? { ...f, progress: percent } : f)),
          );
        });
        setFileProgress((prev) =>
          prev.map((f) =>
            f.id === uploadId ? { ...f, progress: 100, status: "done" } : f,
          ),
        );
      } catch (err) {
        setFileProgress((prev) =>
          prev.map((f) => (f.id === uploadId ? { ...f, status: "error" } : f)),
        );
        throw err;
      }
    }

    async function uploadBatch(files: File[]) {
      if (isFull) {
        notifyBlocked();
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      const succeeded: string[] = [];
      let lastError: string | null = null;

      for (const file of files) {
        try {
          await uploadSingleFile(file);
          succeeded.push(file.name);
        } catch (err) {
          lastError =
            err instanceof Error ? err.message : t("uploadFailed");
          if (isStorageQuotaError(lastError)) break;
        }
      }

      if (succeeded.length > 0) {
        onUploaded?.(succeeded);
      }

      if (lastError) {
        const failedCount = files.length - succeeded.length;
        if (succeeded.length > 0) {
          setUploadError(
            t("partialUploadFailed", {
              count: succeeded.length,
              failed: failedCount,
              reason: lastError,
            }),
          );
        } else {
          setUploadError(lastError);
        }
      }

      setIsUploading(false);
    }

    async function processFiles(fileList: FileList) {
      await uploadBatch(Array.from(fileList));
    }

    function onDragEnter(e: React.DragEvent) {
      if (isUploading || isFull) return;
      e.preventDefault();
      dragCounter.current += 1;
      if (dragCounter.current === 1) setIsDragging(true);
    }

    function onDragLeave(e: React.DragEvent) {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsDragging(false);
    }

    function onDrop(e: React.DragEvent) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      if (isUploading || e.dataTransfer.files.length === 0) return;
      if (isFull) {
        notifyBlocked();
        return;
      }
      void processFiles(e.dataTransfer.files);
    }

    function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (isUploading || !e.target.files || e.target.files.length === 0) return;
      if (isFull) {
        notifyBlocked();
        e.target.value = "";
        return;
      }
      void processFiles(e.target.files);
      e.target.value = "";
    }

    const uploadsBlocked = isFull || isUploading;

    return (
      <div
        className={cn(
          "relative min-w-0",
          roundedClassName && "overflow-hidden",
          roundedClassName,
          className,
        )}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onInputChange}
          disabled={uploadsBlocked}
        />

        {showQuotaBanner && isFull && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium leading-tight">{t("quotaFullTitle")}</p>
              <p className="mt-0.5 leading-relaxed text-caption">{t("quotaFullHint")}</p>
            </div>
          </div>
        )}

        {children}

        {uploadError && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <AnimatePresence>
          {isDragging && !isUploading && (
            <UploadDropzoneOverlay
              key="drag"
              roundedClassName={roundedClassName}
              title={t("dropToUpload")}
              sub={t("dropToUploadHint")}
            />
          )}
        </AnimatePresence>

        <UploadProgressPanel
          files={fileProgress}
          onDismiss={() => setFileProgress([])}
        />
      </div>
    );
  },
);
