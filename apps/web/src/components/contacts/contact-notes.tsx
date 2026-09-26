import { isEmptyTiptapDoc, tiptapDocToText, type TiptapDoc } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function ContactNotes({
  notes,
  className,
}: {
  notes: TiptapDoc | null | undefined;
  className?: string;
}) {
  const { t } = useTranslation("contacts");
  const empty = isEmptyTiptapDoc(notes ?? null);

  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 text-sm font-medium text-foreground">{t("notes.title")}</p>
      <p
        className={cn(
          "line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed",
          empty ? "text-caption" : "text-muted-foreground",
        )}
      >
        {empty ? t("notes.noneYet") : tiptapDocToText(notes ?? null)}
      </p>
    </div>
  );
}
