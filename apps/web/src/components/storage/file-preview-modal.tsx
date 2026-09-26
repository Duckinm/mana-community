// Backdrop + motion chrome around FilePreviewPanel for in-page modal previews.
import { FilePreviewPanel } from "@/components/storage/file-preview-panel";
import type { StorageFile } from "@/components/storage/types";
import { useIsMobileNav } from "@/hooks/use-is-mobile-nav";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "@/components/icons";

interface Props {
  file: StorageFile | null;
  onClose: () => void;
  onDelete?: (file: StorageFile) => void;
}

export function FilePreviewModal({ file, onClose, onDelete }: Props) {
  const isMobile = useIsMobileNav();

  return (
    <AnimatePresence>
      {file && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-surface-overlay/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="panel"
            initial={
              isMobile
                ? { opacity: 0, y: "100%" }
                : { opacity: 0, scale: 0.96, y: 16 }
            }
            animate={
              isMobile
                ? { opacity: 1, y: 0 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              isMobile
                ? { opacity: 0, y: "40%" }
                : { opacity: 0, scale: 0.97, y: 8 }
            }
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex max-h-[92dvh] justify-center xl:inset-0 xl:items-center xl:p-6"
          >
            <div className="pointer-events-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl shadow-modal xl:rounded-2xl">
              <div
                aria-hidden
                className="flex shrink-0 justify-center bg-surface-card pt-2.5 pb-1 xl:hidden"
              >
                <div className="h-1 w-10 rounded-full bg-border-strong" />
              </div>
              <FilePreviewPanel
                file={file}
                onDelete={onDelete}
                headerExtra={
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-raised"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                }
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
