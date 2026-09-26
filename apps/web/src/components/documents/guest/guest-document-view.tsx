import { ManaLogo } from "@/components/brand/mana-logo";
import { formatDocumentAmount } from "@/components/documents/document-display-utils";
import {
  documentLineItemsDescClass,
  documentLineItemsHeaderClass,
  documentLineItemsMetricClass,
  documentLineItemsMetricLabelClass,
  documentLineItemsMoneyClass,
  documentLineItemsRowClass,
  documentLineItemsTableShellClass,
} from "@/components/documents/line-items-grid";
import {
  L,
  type PreviewLang,
} from "@/components/documents/preview/preview-labels";
import type { Document, DocumentItem } from "@/components/documents/types";
import { formatCalendarDate } from "@/lib/calendar-date";
import { phoneHref, splitPhoneNumbers } from "@/lib/phone-numbers";
import { promptPayPayload } from "@/lib/promptpay";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

export type DocumentPreviewSection =
  | "terms"
  | "your"
  | "client"
  | "items"
  | "payment"
  | "remark";

interface GuestDocumentViewProps {
  document: Document;
  diffFields?: Set<string>;
  isBefore?: boolean;
}

function EditCornerPencil() {
  return (
    <div className="pointer-events-none absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
      <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-warning-soft">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path
            d="M2 8L8 2M8 2H4M8 2V6"
            stroke="var(--warning)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-dashed border-border-strong" />;
}

function DiffVal({
  children,
  changed,
  isBefore,
}: {
  children: React.ReactNode;
  changed: boolean;
  isBefore?: boolean;
}) {
  if (!changed) return <>{children}</>;
  const cls = isBefore
    ? "bg-danger/15 text-danger rounded px-1 -mx-1"
    : "bg-success/15 text-success rounded px-1 -mx-1";
  return <span className={cls}>{children}</span>;
}

function AddressBlock({
  name,
  email,
  phone,
  address,
  zip,
  country,
  taxId,
  branchNumber,
  logoUrl,
  diffFields,
  isBefore,
  nameKey,
  emailKey,
  phoneKey,
  addressKey,
  zipKey,
  countryKey,
  taxIdKey,
  branchKey,
  lang,
}: {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  country: string | null;
  taxId: string | null;
  branchNumber: string | null;
  logoUrl?: string | null;
  diffFields?: Set<string>;
  isBefore?: boolean;
  nameKey: string;
  emailKey: string;
  phoneKey: string;
  addressKey: string;
  zipKey: string;
  countryKey: string;
  taxIdKey: string;
  branchKey: string;
  lang: PreviewLang;
}) {
  const d = diffFields;
  const locationLine = [address, [zip, country].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const locationChanged = !!(
    d?.has(zipKey) ||
    d?.has(countryKey) ||
    d?.has(addressKey)
  );

  return (
    <div className="space-y-1">
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo"
          className="h-8 w-auto object-contain mb-3"
        />
      )}
      {name && (
        <p className="text-sm font-semibold text-foreground">
          <DiffVal changed={!!d?.has(nameKey)} isBefore={isBefore}>
            {name}
          </DiffVal>
        </p>
      )}
      {email && (
        <p className="text-xs text-muted-foreground">
          <DiffVal changed={!!d?.has(emailKey)} isBefore={isBefore}>
            {email}
          </DiffVal>
        </p>
      )}
      {phone && (
        <p className="text-xs text-muted-foreground">
          <DiffVal changed={!!d?.has(phoneKey)} isBefore={isBefore}>
            {splitPhoneNumbers(phone).map((phoneNumber, index) => (
              <span key={`${phoneNumber}-${index}`}>
                {index > 0 && ", "}
                <a href={phoneHref(phoneNumber)}>{phoneNumber}</a>
              </span>
            ))}
          </DiffVal>
        </p>
      )}
      {locationLine && (
        <p className="text-xs text-muted-foreground">
          <DiffVal changed={locationChanged} isBefore={isBefore}>
            {locationLine}
          </DiffVal>
        </p>
      )}
      {taxId && (
        <p className="text-xs text-muted-foreground">
          {L("taxId", lang)}:{" "}
          <DiffVal changed={!!d?.has(taxIdKey)} isBefore={isBefore}>
            <span className="font-mono">{taxId}</span>
          </DiffVal>
        </p>
      )}
      {branchNumber && (
        <p className="text-xs text-muted-foreground">
          {L("branch", lang)}:{" "}
          <DiffVal changed={!!d?.has(branchKey)} isBefore={isBefore}>
            <span className="font-mono">{branchNumber}</span>
          </DiffVal>
        </p>
      )}
    </div>
  );
}

function LineItemsSection({
  document: doc,
  diffFields,
  isBefore,
  otherItems,
  lang,
  onClick,
}: {
  document: Document;
  diffFields?: Set<string>;
  isBefore?: boolean;
  otherItems?: DocumentItem[];
  lang: PreviewLang;
  onClick?: () => void;
}) {
  const items: DocumentItem[] = doc.items ?? [];
  const d = diffFields;
  const showDiscount = doc.discountCents > 0;
  const showTax = doc.taxCents > 0;
  const showWht = doc.whtRateBps > 0;

  const otherDescs = new Set((otherItems ?? []).map((i) => i.description));
  const myDescs = new Set(items.map((i) => i.description));

  function itemRowClass(item: DocumentItem): string {
    if (!d?.has("items")) return "";
    const existsInOther = otherDescs.has(item.description);
    if (!existsInOther) return isBefore ? "bg-danger/10" : "bg-success/10";
    return "";
  }

  function itemTextClass(item: DocumentItem): string {
    if (!d?.has("items")) return "text-foreground";
    const existsInOther = otherDescs.has(item.description);
    if (!existsInOther) return isBefore ? "text-danger" : "text-success";
    return "text-foreground";
  }

  return (
    <div
      className={cn(
        "px-4 py-5 sm:px-8 sm:py-6",
        onClick && "group relative cursor-pointer",
      )}
      onClick={onClick}
    >
      {onClick && <EditCornerPencil />}
      <div className="-mx-2 px-2">
        <div className={documentLineItemsTableShellClass}>
          <div className={`${documentLineItemsHeaderClass} mb-3`}>
            <span className="text-2xs uppercase tracking-widest text-caption">
              {L("description", lang)}
            </span>
            <span className="text-2xs uppercase tracking-widest text-right text-caption">
              {L("qty", lang)}
            </span>
            <span className="text-2xs uppercase tracking-widest text-right text-caption">
              {L("unitPrice", lang)}
            </span>
            <span className="text-2xs uppercase tracking-widest text-right text-caption">
              {L("subtotal", lang)}
            </span>
          </div>
          <div className="space-y-0">
            {items.map((item) => (
              <div
                key={item.id}
                className={`${documentLineItemsRowClass} rounded border-b border-dashed border-border-default py-3 last:border-0 ${itemRowClass(item)}`}
              >
                <span
                  className={`${documentLineItemsDescClass} text-sm font-medium leading-snug min-[480px]:text-xs min-[480px]:font-normal ${itemTextClass(item)}`}
                >
                  {item.description}
                </span>
                <span
                  className={`${documentLineItemsMetricClass} text-xs ${itemTextClass(item)}`}
                >
                  <span className={documentLineItemsMetricLabelClass}>
                    {L("qty", lang)}
                  </span>
                  {(item.quantity / 100).toFixed(2)}
                </span>
                <span
                  className={`${documentLineItemsMetricClass} text-right text-xs ${itemTextClass(item)}`}
                >
                  <span className={documentLineItemsMetricLabelClass}>
                    {L("unitPrice", lang)}
                  </span>
                  {formatDocumentAmount(item.unitPriceCents, doc.currency)}
                </span>
                <span
                  className={`${documentLineItemsMetricClass} text-right text-xs ${itemTextClass(item)}`}
                >
                  <span className={documentLineItemsMetricLabelClass}>
                    {L("subtotal", lang)}
                  </span>
                  {formatDocumentAmount(item.subtotalCents, doc.currency)}
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="py-6 text-center text-sm text-caption">
                {L("noLineItems", lang)}
              </p>
            )}
          </div>
          {d?.has("items") &&
            otherItems &&
            (() => {
              const removed = (otherItems ?? []).filter(
                (i) => !myDescs.has(i.description),
              );
              if (!removed.length) return null;
              return removed.map((item) => (
                <div
                  key={`ghost-${item.id}`}
                  className={`${documentLineItemsRowClass} rounded border-b border-border-subtle bg-danger/10 py-3 opacity-50 last:border-0`}
                >
                  <span
                    className={`${documentLineItemsDescClass} text-sm font-medium leading-snug text-danger line-through min-[480px]:font-normal`}
                  >
                    {item.description}
                  </span>
                  <span
                    className={`${documentLineItemsMetricClass} text-xs text-danger line-through min-[480px]:text-sm`}
                  >
                    <span className={documentLineItemsMetricLabelClass}>
                      {L("qty", lang)}
                    </span>
                    {(item.quantity / 100).toFixed(2)}
                  </span>
                  <span
                    className={`${documentLineItemsMetricClass} text-right text-xs text-danger line-through min-[480px]:text-sm`}
                  >
                    <span className={documentLineItemsMetricLabelClass}>
                      {L("unitPrice", lang)}
                    </span>
                    {formatDocumentAmount(item.unitPriceCents, doc.currency)}
                  </span>
                  <span
                    className={`${documentLineItemsMetricClass} text-right text-xs text-danger line-through min-[480px]:text-sm`}
                  >
                    <span className={documentLineItemsMetricLabelClass}>
                      {L("subtotal", lang)}
                    </span>
                    {formatDocumentAmount(item.subtotalCents, doc.currency)}
                  </span>
                </div>
              ));
            })()}
        </div>
      </div>
      <div className="mt-5 ml-auto min-w-[12rem] max-w-xs space-y-2">
        <div className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span className="shrink-0">{L("subtotal", lang)}</span>
          <DiffVal changed={!!d?.has("subtotalCents")} isBefore={isBefore}>
            <span className={documentLineItemsMoneyClass}>
              {formatDocumentAmount(doc.subtotalCents, doc.currency)}
            </span>
          </DiffVal>
        </div>
        {showDiscount && (
          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span className="shrink-0">{L("discount", lang)}</span>
            <DiffVal changed={!!d?.has("discountCents")} isBefore={isBefore}>
              <span className={`text-danger ${documentLineItemsMoneyClass}`}>
                −{formatDocumentAmount(doc.discountCents, doc.currency)}
              </span>
            </DiffVal>
          </div>
        )}
        {showTax && (
          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span className="shrink-0">
              <DiffVal changed={!!d?.has("taxRateBps")} isBefore={isBefore}>
                {L("tax", lang)} ({(doc.taxRateBps / 100).toFixed(0)}%)
              </DiffVal>
            </span>
            <DiffVal changed={!!d?.has("taxCents")} isBefore={isBefore}>
              <span className={documentLineItemsMoneyClass}>
                {formatDocumentAmount(doc.taxCents, doc.currency)}
              </span>
            </DiffVal>
          </div>
        )}
        {showWht && (
          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span className="shrink-0">
              <DiffVal changed={!!d?.has("whtRateBps")} isBefore={isBefore}>
                {L("wht", lang)} ({(doc.whtRateBps / 100).toFixed(0)}%)
              </DiffVal>
            </span>
            <DiffVal changed={!!d?.has("whtCents")} isBefore={isBefore}>
              <span className={`text-danger ${documentLineItemsMoneyClass}`}>
                −{formatDocumentAmount(doc.whtCents, doc.currency)}
              </span>
            </DiffVal>
          </div>
        )}
        <div className="flex justify-between gap-4 pt-2 border-t border-dashed border-border-strong text-sm font-bold text-foreground break-inside-avoid">
          <span className="shrink-0">{L("total", lang)}</span>
          <DiffVal changed={!!d?.has("totalCents")} isBefore={isBefore}>
            <span className={documentLineItemsMoneyClass}>
              {formatDocumentAmount(doc.totalCents, doc.currency)}
            </span>
          </DiffVal>
        </div>
      </div>
    </div>
  );
}

function PaymentSection({
  document: doc,
  diffFields,
  isBefore,
  lang,
  onClick,
}: {
  document: Document;
  diffFields?: Set<string>;
  isBefore?: boolean;
  lang: PreviewLang;
  onClick?: () => void;
}) {
  if (doc.type === "QO") return null;
  const hasBank = doc.bankName || doc.accountNumber || doc.accountName;
  const hasPromptPay = !!doc.promptPayId;
  const hasCard = doc.cardNumber || doc.cardholderName;
  const hasAny = !!(hasBank || hasPromptPay || hasCard || doc.paymentTermsText);
  // Clickable previews keep the empty section visible so the step stays reachable.
  if (!hasAny && !onClick) return null;
  const d = diffFields;

  return (
    <div
      className={cn(
        "px-4 py-5 break-inside-avoid sm:px-8 sm:py-6",
        onClick && "group relative cursor-pointer",
      )}
      onClick={onClick}
    >
      {onClick && <EditCornerPencil />}
      <div>
        <p className="text-2xs uppercase tracking-widest mb-3 text-muted-foreground">
          {L("paymentDetails", lang)}
        </p>
        <div className="space-y-1.5">
          {!hasAny && <p className="text-xs text-muted-foreground">—</p>}
          {doc.paymentTermsText && (
            <p className="text-xs text-foreground">{doc.paymentTermsText}</p>
          )}
          {doc.bankName && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("bank", lang)}
              </span>
              <DiffVal changed={!!d?.has("bankName")} isBefore={isBefore}>
                <span className="text-foreground">{doc.bankName}</span>
              </DiffVal>
            </div>
          )}
          {doc.accountName && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("account", lang)}
              </span>
              <DiffVal changed={!!d?.has("accountName")} isBefore={isBefore}>
                <span className="text-foreground">{doc.accountName}</span>
              </DiffVal>
            </div>
          )}
          {doc.accountNumber && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("accountNo", lang)}
              </span>
              <DiffVal changed={!!d?.has("accountNumber")} isBefore={isBefore}>
                <span className="font-mono text-foreground">
                  {doc.accountNumber}
                </span>
              </DiffVal>
            </div>
          )}
          {doc.swiftCode && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("swift", lang)}
              </span>
              <DiffVal changed={!!d?.has("swiftCode")} isBefore={isBefore}>
                <span className="font-mono text-foreground">
                  {doc.swiftCode}
                </span>
              </DiffVal>
            </div>
          )}
          {doc.promptPayId && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("promptPay", lang)}
              </span>
              <DiffVal changed={!!d?.has("promptPayId")} isBefore={isBefore}>
                <span className="font-mono text-foreground">
                  {doc.promptPayId}
                </span>
              </DiffVal>
            </div>
          )}
          {doc.promptPayId && doc.currency === "THB" && !doc.paidAt && (
            <div className="flex flex-col gap-4 pt-2 min-[420px]:flex-row min-[420px]:items-center">
              <div className="shrink-0 rounded-lg bg-white p-2">
                <QRCodeSVG
                  value={promptPayPayload(doc.promptPayId, doc.amountDueCents)}
                  size={160}
                />
              </div>
              <div className="text-xs">
                <p className="font-medium text-foreground">
                  {L("scanToPay", lang)}
                </p>
                <p className="mt-0.5 font-mono text-muted-foreground">
                  {formatDocumentAmount(doc.amountDueCents, doc.currency)}
                </p>
              </div>
            </div>
          )}
          {doc.cardNumber && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("cardNumber", lang)}
              </span>
              <DiffVal changed={!!d?.has("cardNumber")} isBefore={isBefore}>
                <span className="font-mono text-foreground">
                  {doc.cardNumber}
                </span>
              </DiffVal>
            </div>
          )}
          {doc.cardholderName && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("cardholderName", lang)}
              </span>
              <DiffVal changed={!!d?.has("cardholderName")} isBefore={isBefore}>
                <span className="text-foreground">{doc.cardholderName}</span>
              </DiffVal>
            </div>
          )}
          {doc.cardExpiry && (
            <div className="flex gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">
                {L("cardExpiry", lang)}
              </span>
              <DiffVal changed={!!d?.has("cardExpiry")} isBefore={isBefore}>
                <span className="font-mono text-foreground">
                  {doc.cardExpiry}
                </span>
              </DiffVal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface SignaturePlacement {
  x: number;
  y: number;
  w: number;
}

const DEFAULT_SIGNATURE_PLACEMENT: SignaturePlacement = { x: 62, y: 82, w: 26 };

export function parseSignaturePlacement(
  raw: string | null | undefined,
): SignaturePlacement {
  if (!raw) return DEFAULT_SIGNATURE_PLACEMENT;
  try {
    const p = JSON.parse(raw) as Partial<SignaturePlacement>;
    return {
      x: typeof p.x === "number" ? p.x : DEFAULT_SIGNATURE_PLACEMENT.x,
      y: typeof p.y === "number" ? p.y : DEFAULT_SIGNATURE_PLACEMENT.y,
      w: typeof p.w === "number" ? p.w : DEFAULT_SIGNATURE_PLACEMENT.w,
    };
  } catch {
    return DEFAULT_SIGNATURE_PLACEMENT;
  }
}

function SignatureLayer({ document: doc }: { document: Document }) {
  if (doc.type !== "INV" || !doc.signatureEnabled || !doc.signatureImage) {
    return null;
  }
  const { x, y, w } = parseSignaturePlacement(doc.signaturePlacement);
  return (
    <img
      src={doc.signatureImage}
      alt="Signature"
      className="pointer-events-none absolute object-contain"
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%` }}
    />
  );
}

interface GuestDocumentViewPropsExtended extends GuestDocumentViewProps {
  otherDocument?: Document;
  /** When set, sections become click targets (wizard/promote previews). DOM is unchanged when absent — the PDF renderer screenshots this component. */
  onSectionClick?: (section: DocumentPreviewSection) => void;
  className?: string;
  showBranding?: boolean;
}

export function GuestDocumentView({
  document: doc,
  diffFields,
  isBefore,
  otherDocument,
  onSectionClick,
  className,
  showBranding = true,
}: GuestDocumentViewPropsExtended) {
  const lang = doc.documentLanguage;
  const hit = (section: DocumentPreviewSection) =>
    onSectionClick ? () => onSectionClick(section) : undefined;
  const hitClass = onSectionClick ? "group relative cursor-pointer" : undefined;
  const guestTypeLabels: Record<Document["type"], string> = {
    QO: L("quotation", lang),
    INV: L("invoice", lang),
    RC: L("receipt", lang),
  };
  const typeLabel = guestTypeLabels[doc.type];
  const d = diffFields;
  const otherItems = otherDocument?.items;

  return (
    <div
      data-pdf-ready
      className={cn(
        "relative mx-auto flex min-h-[842px] rounded-2xl w-full max-w-[595px] flex-col overflow-hidden border border-dashed border-border-strong bg-surface-card shadow-sm",
        className,
      )}
    >
      <SignatureLayer document={doc} />
      <div
        className={cn(
          "flex items-start justify-between gap-3 border-b border-dashed border-border-strong px-4 py-4 sm:gap-6 sm:px-8 sm:py-5",
          hitClass,
        )}
        onClick={hit("terms")}
      >
        {onSectionClick && <EditCornerPencil />}
        <div className="min-w-0 flex-1">
          <p className="text-2xs uppercase tracking-widest text-caption mb-1">
            {typeLabel}
          </p>
          <p className="text-lg font-bold font-mono text-foreground">
            {doc.number}
          </p>
        </div>
        <div className="text-right space-y-3">
          <div>
            <p className="text-2xs uppercase tracking-widest text-caption mb-0.5">
              {L("issued", lang)}
            </p>
            <p className="text-sm font-medium text-foreground">
              <DiffVal changed={!!d?.has("issueDate")} isBefore={isBefore}>
                {formatCalendarDate(doc.issueDate)}
              </DiffVal>
            </p>
          </div>
          {doc.dueDate && (
            <div>
              <p className="text-2xs uppercase tracking-widest text-caption mb-0.5">
                {L("due", lang)}
              </p>
              <p className="text-sm font-medium text-foreground">
                <DiffVal changed={!!d?.has("dueDate")} isBefore={isBefore}>
                  {formatCalendarDate(doc.dueDate)}
                </DiffVal>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 min-[480px]:grid-cols-2">
        <div className={cn("p-4 sm:p-6", hitClass)} onClick={hit("your")}>
          {onSectionClick && <EditCornerPencil />}
          <p className="text-2xs uppercase tracking-widest text-caption mb-3">
            {L("from", lang)}
          </p>
          <AddressBlock
            name={doc.registeredName}
            email={doc.yourEmail}
            phone={doc.yourPhone}
            address={doc.registeredAddress}
            zip={doc.yourZip}
            country={doc.yourCountry}
            taxId={doc.yourTaxId}
            branchNumber={doc.yourBranchNumber}
            logoUrl={doc.yourLogo}
            diffFields={d}
            isBefore={isBefore}
            nameKey="registeredName"
            emailKey="yourEmail"
            phoneKey="yourPhone"
            addressKey="registeredAddress"
            zipKey="yourZip"
            countryKey="yourCountry"
            taxIdKey="yourTaxId"
            branchKey="yourBranchNumber"
            lang={lang}
          />
        </div>
        <div
          className={cn(
            "border-t border-dashed border-border-strong p-4 min-[480px]:border-l min-[480px]:border-t-0 sm:p-6",
            hitClass,
          )}
          onClick={hit("client")}
        >
          {onSectionClick && <EditCornerPencil />}
          <p className="text-2xs uppercase tracking-widest text-caption mb-3">
            {L("to", lang)}
          </p>
          <AddressBlock
            name={doc.clientName}
            email={doc.clientEmail}
            phone={doc.clientPhone}
            address={doc.clientAddress}
            zip={doc.clientZip}
            country={doc.clientCountry}
            taxId={doc.clientTaxId}
            branchNumber={doc.clientBranchNumber}
            diffFields={d}
            isBefore={isBefore}
            nameKey="clientName"
            emailKey="clientEmail"
            phoneKey="clientPhone"
            addressKey="clientAddress"
            zipKey="clientZip"
            countryKey="clientCountry"
            taxIdKey="clientTaxId"
            branchKey="clientBranchNumber"
            lang={lang}
          />
        </div>
      </div>

      <SectionDivider />
      <LineItemsSection
        document={doc}
        diffFields={d}
        isBefore={isBefore}
        otherItems={otherItems}
        lang={lang}
        onClick={hit("items")}
      />
      <SectionDivider />
      <PaymentSection
        document={doc}
        diffFields={d}
        isBefore={isBefore}
        lang={lang}
        onClick={hit("payment")}
      />
      <div
        className={cn(
          "mt-auto border-t border-dashed border-border-strong px-4 py-5 break-inside-avoid sm:px-8 sm:py-6",
          hitClass,
        )}
        onClick={hit("remark")}
      >
        {onSectionClick && <EditCornerPencil />}
        <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-2">
          {L("remark", lang)}
        </p>
        {doc.remark?.trim() ? (
          <DiffVal changed={!!d?.has("remark")} isBefore={isBefore}>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {doc.remark}
            </p>
          </DiffVal>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>

      {showBranding && (
        <div className="border-t border-border-subtle px-4 py-4 sm:px-8">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground">
              {L("poweredBy", lang)}
            </span>
            <ManaLogo className="h-6 w-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
