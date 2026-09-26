import { ChevronRight, Folder, FolderOpen, X } from "@/components/icons";
import type { StorageFolder } from "@/components/storage/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFolderTree } from "@/context/storage";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface Props {
  open: boolean;
  fileCount: number;
  onClose: () => void;
  onConfirm: (folderId: string | null) => void;
}

interface FolderNodeProps {
  folder: StorageFolder;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function FolderNode({ folder, depth, selectedId, onSelect }: FolderNodeProps) {
  const { getChildFolders } = useFolderTree();
  const children = getChildFolders(folder.id);
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-fast group",
          isSelected
            ? "bg-primary-soft border border-primary-border"
            : "hover:bg-surface-raised",
        )}
        style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
        onClick={() => onSelect(folder.id)}
      >
        {children.length > 0 ? (
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            <ChevronRight
              size={12}
              className={cn(
                "transition-transform duration-fast",
                expanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {isSelected ? (
          <FolderOpen
            size={14}
            className="text-primary shrink-0"
            strokeWidth={1.5}
          />
        ) : (
          <Folder
            size={14}
            className="text-muted-foreground shrink-0"
            strokeWidth={1.5}
          />
        )}
        <span
          className={cn(
            "text-sm truncate",
            isSelected
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          {folder.name}
        </span>
      </div>

      <AnimatePresence>
        {expanded && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BulkMoveDialog({ open, fileCount, onClose, onConfirm }: Props) {
  const { getRootFolders } = useFolderTree();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roots = getRootFolders();

  function handleConfirm() {
    onConfirm(selectedId);
    setSelectedId(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex h-[min(70vh,480px)] max-w-sm flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold text-foreground">
            Move {fileCount} {fileCount === 1 ? "file" : "files"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose a destination folder
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-fast",
              selectedId === null
                ? "bg-primary-soft border border-primary-border"
                : "hover:bg-surface-raised",
            )}
            onClick={() => setSelectedId(null)}
          >
            <span className="w-3 shrink-0" />
            <Folder
              size={14}
              className={cn(
                "shrink-0",
                selectedId === null ? "text-primary" : "text-muted-foreground",
              )}
              strokeWidth={1.5}
            />
            <span
              className={cn(
                "text-sm",
                selectedId === null
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              Root (no folder)
            </span>
          </div>

          {roots.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              depth={0}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>

        <div className="drawer-footer">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
          >
            <X size={12} />
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
          >
            Move here
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
