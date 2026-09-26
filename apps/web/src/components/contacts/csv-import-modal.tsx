import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, FileText, Upload, X } from "@/components/icons";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CsvRow {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

function parseQuotedCsv(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(raw: string): CsvRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseQuotedCsv(lines[0]).map((h) => h.toLowerCase());
  const idx = (key: string) => headers.indexOf(key);

  return lines.slice(1).map((line) => {
    const cols = parseQuotedCsv(line);
    return {
      name: cols[idx("name")] ?? "",
      email: cols[idx("email")] ?? "",
      phone: cols[idx("phone")] ?? "",
      company: cols[idx("company")] ?? "",
      notes: cols[idx("notes")] ?? "",
    };
  });
}

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportModal({ open, onOpenChange }: CsvImportModalProps) {
  const { t } = useTranslation("contacts");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setRows([]);
    setFileName("");
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setParseError(t("csvImport.onlyCsv"));
      return;
    }
    setParseError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setParseError(t("csvImport.noRowsFound"));
      } else {
        setRows(parsed);
      }
    };
    reader.readAsText(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const result = expectEden(
        await client.api.contacts.import.post({ rows }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(
        t("csvImport.imported", { count: result.imported }) +
          (result.skipped > 0
            ? t("csvImport.skippedSuffix", { count: result.skipped })
            : ""),
      );
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("csvImport.importFailed"));
    } finally {
      setLoading(false);
    }
  }

  const preview = rows.slice(0, 5);
  const remaining = rows.length - preview.length;
  const validCount = rows.filter((r) => r.name.trim()).length;
  const skipCount = rows.length - validCount;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) {
          onOpenChange(o);
          if (!o) reset();
        }
      }}
    >
      <DialogContent
        data-testid="csv-import-dialog"
        className="flex max-h-[min(85vh,640px)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {t("csvImport.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("csvImport.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-3">
          <div
            role={fileName ? undefined : "button"}
            tabIndex={fileName ? undefined : 0}
            aria-label={fileName ? undefined : t("csvImport.dropHere")}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              dragging
                ? "border-primary bg-primary-soft"
                : "border-border-subtle hover:border-border-default bg-surface-card"
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (!fileName && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
            <AnimatePresence mode="wait">
              {fileName ? (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center justify-center gap-2"
                >
                  <FileText
                    size={16}
                    className="text-primary"
                    strokeWidth={2}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {fileName}
                  </span>
                  <button
                    type="button"
                    aria-label={t("csvImport.removeFile")}
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="ml-1 p-0.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <p className="text-sm font-medium text-foreground">
                    {t("csvImport.dropHere")}
                  </p>
                  <p className="text-caption text-xs">
                    {t("csvImport.expectedColumns")}{" "}
                    <code className="font-mono text-xs bg-surface-raised px-1 py-0.5 rounded">
                      name, email, phone, company, notes
                    </code>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5">
              <AlertCircle
                size={14}
                className="text-danger shrink-0 mt-0.5"
                strokeWidth={2}
              />
              <p className="text-xs text-danger">{parseError}</p>
            </div>
          )}

          <AnimatePresence>
            {rows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("csvImport.preview")}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-success font-medium">
                      {t("csvImport.toImport", { count: validCount })}
                    </span>
                    {skipCount > 0 && (
                      <span className="text-warning font-medium">
                        {t("csvImport.willSkip", { count: skipCount })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border-subtle overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-raised">
                        {(
                          [
                            ["colName", "Name"],
                            ["colEmail", "Email"],
                            ["colPhone", "Phone"],
                            ["colCompany", "Company"],
                          ] as const
                        ).map(([key]) => (
                          <th
                            key={key}
                            className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider"
                          >
                            {t(`csvImport.${key}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-border-subtle last:border-0 ${
                            !row.name.trim() ? "opacity-40" : ""
                          }`}
                        >
                          <td className="px-3 py-2 font-medium text-foreground truncate max-w-[140px]">
                            {row.name || (
                              <span className="text-warning italic">
                                {t("csvImport.emptyWillSkip")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">
                            {row.email || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.phone || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">
                            {row.company || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {remaining > 0 && (
                    <div className="px-3 py-2 text-caption text-xs bg-surface-card border-t border-border-subtle">
                      {t("csvImport.moreRows", { count: remaining })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            disabled={loading}
            className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
          >
            {t("csvImport.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading || validCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                {t("csvImport.importing")}
              </>
            ) : (
              <>
                <Upload size={13} strokeWidth={2.5} />
                {t("csvImport.importButton", { count: validCount })}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
