import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import type { StorageFile } from "@/components/storage/types";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Tag, X } from "@/components/icons";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Props {
  file: StorageFile;
  compact?: boolean;
}

export function FileTags({ file, compact = false }: Props) {
  const { t } = useTranslation("storage");
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function saveTags(newTags: string[]) {
    setSaving(true);
    try {
      const result = await client.api.storage.files({ id: file.id }).tags.patch({ tags: newTags });
      if (result.error) throw new Error("Failed to update tags");

      queryClient.setQueryData<StorageFile[]>(queryKeys.storageFiles, (prev = []) =>
        prev.map((f) => (f.id === file.id ? { ...f, tags: newTags } : f)),
      );
    } catch {
      toast.error(t("updateTagsFailed"));
    } finally {
      setSaving(false);
    }
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || file.tags.includes(tag)) return;
    void saveTags([...file.tags, tag]);
    setInputValue("");
  }

  function removeTag(tag: string) {
    void saveTags(file.tags.filter((t) => t !== tag));
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {file.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-category-purple-soft px-2 py-0.5 text-2xs text-category-purple"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Tag size={11} className="text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs font-medium text-muted-foreground">Tags</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <AnimatePresence>
          {file.tags.map((tag) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-category-purple-soft text-category-purple"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-danger transition-colors duration-fast"
                disabled={saving}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(inputValue);
            }
            if (e.key === "Backspace" && !inputValue && file.tags.length > 0) {
              removeTag(file.tags[file.tags.length - 1]);
            }
          }}
          onBlur={() => {
            if (inputValue.trim()) addTag(inputValue);
          }}
          placeholder={file.tags.length === 0 ? "Add tag…" : "+"}
          disabled={saving}
          className="flex-1 min-w-16 bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground disabled:opacity-50"
        />
      </div>

      <p className="text-2xs text-caption">Press Enter or comma to add</p>
    </div>
  );
}
