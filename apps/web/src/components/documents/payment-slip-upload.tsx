import { useCapabilities } from "@/hooks/use-capabilities";
import { CapabilityNotice } from "@/components/capability-notice";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { Clock, Loader2, Upload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { PaymentSlip } from "@/components/documents/types";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const BASE_URL = resolveApiBaseUrl();

export type PaymentSlipUploadTarget =
  | { kind: "owner"; documentId: string }
  | { kind: "guest"; token: string };

export async function postPaymentSlip(
  target: PaymentSlipUploadTarget,
  file: File,
): Promise<{ paymentSlip: PaymentSlip }> {
  const form = new FormData();
  form.append("file", file);
  const path =
    target.kind === "owner"
      ? `${BASE_URL}/api/documents/${target.documentId}/payment-slip`
      : `${BASE_URL}/api/documents/view/${target.token}/payment-slip`;
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    throw new Error(err?.message ?? err?.error ?? "Upload failed");
  }
  return (await res.json()) as { paymentSlip: PaymentSlip };
}

interface PaymentSlipUploadProps {
  target: PaymentSlipUploadTarget;
  onUploaded: (slip: PaymentSlip) => void;
  variant?: "owner" | "guest";
}

export function PaymentSlipUpload({
  target,
  onUploaded,
  variant = "owner",
}: PaymentSlipUploadProps) {
  const { t } = useTranslation("documents");
  const capabilities = useCapabilities();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { paymentSlip } = await postPaymentSlip(target, file);
      onUploaded(paymentSlip);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("paymentSlip.uploadFailed"),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={
        variant === "guest"
          ? "rounded-2xl border border-border-subtle bg-surface-card p-4 space-y-2"
          : "rounded-xl border border-border p-4 space-y-2"
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void handleFile(file);
        }}
      />
      <p className="text-sm font-medium text-foreground">
        {variant === "guest"
          ? t("paymentSlip.guestUploadPrompt")
          : t("paymentSlip.ownerUploadPrompt")}
      </p>
      <p className="text-xs text-muted-foreground">
        {variant === "guest"
          ? t("paymentSlip.guestUploadHint")
          : t("paymentSlip.ownerUploadHint")}
      </p>
      <CapabilityNotice available={capabilities.data?.ai} unavailableKey="paymentSlipExtractionUnavailable" />
      <CapabilityNotice available={capabilities.data?.paymentSlipVerification} unavailableKey="paymentSlipVerificationUnavailable" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {uploading ? t("paymentSlip.uploading") : t("paymentSlip.uploadButton")}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function PaymentSlipPendingNotice() {
  const { t } = useTranslation("documents");
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-4 flex items-start gap-3">
      <Clock size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {t("paymentSlip.pendingTitle")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("paymentSlip.pendingHint")}
        </p>
      </div>
    </div>
  );
}
