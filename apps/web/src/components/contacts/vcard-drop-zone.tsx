import { Loader2, Upload } from "@/components/icons";
import { client } from "@/lib/eden";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const MAX_VCF_BYTES = 512 * 1024;

function isVcardFile(file: File): boolean {
  if (file.name.toLowerCase().endsWith(".vcf")) return true;
  return file.type === "text/vcard" || file.type === "text/x-vcard";
}

interface VcardDropZoneProps {
  onImported: () => void;
}

/** Drag-and-drop vCard import living directly on the card, with size/type validation beyond the accept attr. */
export function VcardDropZone({ onImported }: VcardDropZoneProps) {
  const { t } = useTranslation("contacts");
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function importFile(file: File) {
    if (!isVcardFile(file)) {
      toast.error(
        t("newContact.vcardInvalidType", { defaultValue: "Only .vcf files are supported." }),
      );
      return;
    }
    if (file.size > MAX_VCF_BYTES) {
      toast.error(
        t("newContact.vcardTooLarge", { defaultValue: "File is too large (max 512 KB)." }),
      );
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const res = await client.api.contacts.import.vcard.post({ vcf: text });
      if (!res.error && res.data) {
        toast.success(t("newContact.vcardImported", { count: res.data.imported }));
        onImported();
      } else {
        toast.error(t("newContact.vcardFailed"));
      }
    } catch {
      toast.error(t("newContact.vcardFailed"));
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void importFile(file);
      }}
      className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs transition-colors duration-base ${
        dragging
          ? "border-primary-border bg-primary-soft text-primary"
          : "border-border-subtle text-muted-foreground hover:border-border-default"
      }`}
    >
      {importing ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Upload size={13} strokeWidth={2.25} />
      )}
      <span>
        {t("newContact.vcardDropHint", { defaultValue: "Drop a .vcf card here, or" })}{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
          className="font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          {t("newContact.vcardBrowse", { defaultValue: "browse" })}
        </button>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
        }}
      />
    </div>
  );
}
