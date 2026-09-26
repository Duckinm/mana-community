import { DatePicker } from "@/components/documents/ui/date-picker";
import { FieldInput } from "@/components/documents/ui/field-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentType } from "@/components/documents/types";
import type { Wallet } from "@/components/finance/types";
import { useRemarkTemplates } from "@/hooks/use-remark-templates";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <FieldInput
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Same remark control as the create wizard: pick a library template, keep the source document's remark, or none. */
export function RemarkTemplateSelect({
  targetType,
  sourceRemark,
  sourceNumber,
  value,
  onChange,
}: {
  targetType: DocumentType;
  sourceRemark: string | null;
  sourceNumber: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { t } = useTranslation("documents");
  const { remarkTemplates, defaultTemplateFor } = useRemarkTemplates();
  const defaultTemplate = defaultTemplateFor(targetType);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !defaultTemplate) return;
    applied.current = true;
    if (!value?.trim()) onChange(defaultTemplate.body);
  }, [defaultTemplate, value, onChange]);

  const matched = remarkTemplates.find((tpl) => tpl.body === value);
  const selected = !value?.trim() ? "__none__" : (matched?.id ?? "__source__");

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">
        {t("promotion.remark")}
      </label>
      <Select
        value={selected}
        onValueChange={(v) => {
          if (v === "__none__") onChange(null);
          else if (v === "__source__") onChange(sourceRemark);
          else onChange(remarkTemplates.find((tpl) => tpl.id === v)?.body ?? null);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!!sourceRemark?.trim() && (
            <SelectItem value="__source__">
              {t("promotion.fromNumber", { number: sourceNumber })}
            </SelectItem>
          )}
          <SelectItem value="__none__">{t("documentTermsForm.none")}</SelectItem>
          {remarkTemplates.map((tpl) => (
            <SelectItem key={tpl.id} value={tpl.id}>
              {tpl.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function WalletSelect({
  wallets,
  label,
  value,
  onChange,
}: {
  wallets: Wallet[];
  label: string;
  value: string;
  onChange: (walletId: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {wallets.map((wallet) => (
            <SelectItem key={wallet.id} value={wallet.id}>
              {wallet.name}
              {wallet.lastFour ? ` ···· ${wallet.lastFour}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  error,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  min?: string | null;
}) {
  return (
    <div>
      <DatePicker
        label={label}
        value={value || null}
        min={min}
        onChange={(date) => onChange(date ?? "")}
      />
      {error && <p className="pt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
