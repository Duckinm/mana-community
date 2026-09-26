// Shared preview body (header + content) used by both the full-page file
// route and the masked modal route. FilePreviewModal wraps this with backdrop/motion chrome.
import { Download, Trash2 } from "@/components/icons";
import { FileIcon, kindColor } from "@/components/storage/file-icon";
import type { StorageFile } from "@/components/storage/types";
import { formatUploadedAt } from "@/components/storage/uploaded-at";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorageMutations } from "@/context/storage";
import { formatBinaryBytes } from "@/lib/format-bytes";
import { triggerDownloadFromUrl } from "@/lib/trigger-download";
import { useEffect, useState } from "react";

function ImagePreview({ file, url }: { file: StorageFile; url: string | null }) {
  return (
    <div
      className="w-full flex items-center justify-center rounded-xl overflow-hidden"
      style={{
        background: "repeating-conic-gradient(var(--border-subtle) 0% 25%, transparent 0% 50%)",
        backgroundSize: "20px 20px",
        minHeight: 320,
      }}
    >
      {!url ? (
        <Skeleton className="w-full rounded-xl" style={{ minHeight: 320 }} />
      ) : (
        <img
          src={url}
          alt={file.name}
          className="max-w-full max-h-[60vh] object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0.3";
          }}
        />
      )}
    </div>
  );
}

function PdfPreview({ file, url, onDownload }: { file: StorageFile; url: string | null; onDownload: () => void }) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [url]);

  if (!url) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <Skeleton className="w-full rounded-lg" style={{ minHeight: 480 }} />
      </div>
    );
  }

  if (loadError) {
    const color = kindColor(file.kind);
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <FileIcon kind={file.kind} size={20} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Unable to display PDF in browser</p>
          <p className="text-xs mt-1 text-muted-foreground">Download the file to view it in your PDF reader</p>
        </div>
        <button onClick={onDownload} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 bg-primary text-primary-foreground">
          <Download size={14} strokeWidth={2} />
          Download PDF
        </button>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full rounded-lg border border-border"
      style={{ minHeight: 480 }}
      title={file.name}
      onError={() => setLoadError(true)}
    />
  );
}

function DocPreview({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="flex justify-center py-4">
      <div className="w-full max-w-sm rounded-xl px-8 py-10 shadow-xl bg-card border border-border">
        <div className="h-6 w-2/3 rounded mb-3 bg-border-strong" />
        <div className="space-y-1.5 mb-5">
          {[88, 93, 79, 85].map((w, i) => (
            <div key={i} className="h-2 rounded bg-border" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="h-4 w-2/5 rounded mb-3 bg-border-strong" />
        <div className="space-y-2 pl-4 mb-5">
          {[70, 78, 62].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-secondary" />
              <div className="h-2 rounded bg-border" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
        <div className="space-y-1.5 mb-6">
          {[91, 84, 76].map((w, i) => (
            <div key={i} className="h-2 rounded bg-border" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="pt-4 border-t border-border flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground text-center">Preview not available — download to view</p>
          <button onClick={onDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-95 bg-primary text-primary-foreground">
            <Download size={12} strokeWidth={2} />
            Download file
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetPreview({ onDownload }: { onDownload: () => void }) {
  const headers = ["Date", "Description", "Category", "Amount"];
  const rows = [
    ["Nov 10", "Invoice #031", "Design", "$6,400"],
    ["Oct 28", "Invoice #029", "Dev", "$4,800"],
    ["Oct 15", "Software sub.", "Expense", "-$162"],
    ["Oct 10", "Invoice #027", "Design", "$3,200"],
    ["Sep 30", "Hosting fees", "Expense", "-$89"],
  ];

  return (
    <div className="py-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-border-subtle">
              {headers.map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground border-b border-border">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "var(--border-subtle)" }}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-2.5 border-b border-border-subtle"
                    style={{
                      color: j === 3 ? (cell.startsWith("-") ? "var(--category-orange)" : "var(--primary)") : "var(--text-faint)",
                      fontVariantNumeric: j === 3 ? "tabular-nums" : undefined,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex flex-col items-center gap-3">
        <p className="text-xs text-muted-foreground text-center">Preview not available — download to view</p>
        <button onClick={onDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-95 bg-primary text-primary-foreground">
          <Download size={12} strokeWidth={2} />
          Download file
        </button>
      </div>
    </div>
  );
}

function VideoPreview({ file, url }: { file: StorageFile; url: string | null }) {
  return (
    <div className="relative w-full rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "#0a0a0a", minHeight: 280 }}>
      {url ? (
        <video src={url} controls className="w-full max-h-[60vh]" style={{ display: "block" }} />
      ) : (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          {file.name}
        </p>
      )}
    </div>
  );
}

function NoPreview({ file, onDownload }: { file: StorageFile; onDownload: () => void }) {
  const color = kindColor(file.kind);
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <FileIcon kind={file.kind} size={20} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">No preview available</p>
        <p className="text-xs mt-1 text-muted-foreground">This file type cannot be previewed in the browser</p>
      </div>
      <button onClick={onDownload} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 bg-primary text-primary-foreground">
        <Download size={14} strokeWidth={2} />
        Download file
      </button>
    </div>
  );
}

const PREVIEWABLE = new Set(["image", "pdf", "doc", "sheet", "video"]);

export function FilePreviewPanel({
  file,
  onDelete,
  headerExtra,
}: {
  file: StorageFile;
  onDelete?: (file: StorageFile) => void;
  headerExtra?: React.ReactNode;
}) {
  const { getDownloadUrl } = useStorageMutations();
  const canPreview = PREVIEWABLE.has(file.kind);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    setDownloadUrl(null);
    getDownloadUrl(file.id)
      .then(setDownloadUrl)
      .catch(() => setDownloadUrl(null));
  }, [file.id, getDownloadUrl]);

  function handleDownload() {
    if (downloadUrl) triggerDownloadFromUrl(downloadUrl, file.name);
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-modal border border-input">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <FileIcon kind={file.kind} size={14} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{file.name}</p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {formatBinaryBytes(file.sizeBytes)} · {formatUploadedAt(file.uploadedAt)}
          </p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={!downloadUrl}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          <Download size={12} strokeWidth={2.5} />
          Download
        </Button>
        {onDelete && (
          <Button
            onClick={() => onDelete(file)}
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 rounded-xl shrink-0 text-danger hover:bg-danger-soft hover:text-danger"
            title="Move to trash"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </Button>
        )}
        {headerExtra}
      </div>

      <div className="p-5 max-h-[68vh] overflow-y-auto">
        {!canPreview && <NoPreview file={file} onDownload={handleDownload} />}
        {file.kind === "image" && <ImagePreview file={file} url={downloadUrl} />}
        {file.kind === "pdf" && <PdfPreview file={file} url={downloadUrl} onDownload={handleDownload} />}
        {file.kind === "doc" && <DocPreview onDownload={handleDownload} />}
        {file.kind === "sheet" && <SheetPreview onDownload={handleDownload} />}
        {file.kind === "video" && <VideoPreview file={file} url={downloadUrl} />}
      </div>
    </div>
  );
}
