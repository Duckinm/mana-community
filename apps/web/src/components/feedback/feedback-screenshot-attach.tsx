import { useEffect, useRef, useState } from "react";
import { Camera, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_BYTES = 5 * 1024 * 1024;

export interface FeedbackScreenshot {
  file: File;
  previewUrl: string;
}

interface Props {
  screenshot: FeedbackScreenshot | null;
  onChange: (screenshot: FeedbackScreenshot | null) => void;
  attachLabel: string;
  tooLargeLabel: string;
}

export function FeedbackScreenshotAttach({
  screenshot,
  onChange,
  attachLabel,
  tooLargeLabel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (screenshot) URL.revokeObjectURL(screenshot.previewUrl);
    };
  }, [screenshot]);

  const acceptFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_BYTES) {
      toast.error(tooLargeLabel);
      return;
    }
    if (screenshot) URL.revokeObjectURL(screenshot.previewUrl);
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  };

  return (
    <div
      className="flex items-center gap-2"
      onPaste={(e) => acceptFile(e.clipboardData.files[0])}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
      {screenshot ? (
        <FeedbackScreenshotThumbnail
          screenshot={screenshot}
          onRemove={() => onChange(null)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={14} />
          {attachLabel}
        </Button>
      )}
    </div>
  );
}

function FeedbackScreenshotThumbnail({
  screenshot,
  onRemove,
}: {
  screenshot: FeedbackScreenshot;
  onRemove: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border-subtle bg-surface-raised">
      <img
        src={screenshot.previewUrl}
        alt=""
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-base ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-overlay text-muted-foreground hover:text-foreground"
      >
        <X size={10} />
      </button>
    </div>
  );
}
