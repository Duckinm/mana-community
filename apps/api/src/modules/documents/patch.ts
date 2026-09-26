import { db } from "@api/db";
import { todayCalendarDate, addCalendarMonths } from "@api/lib/calendar-date";
import { NotFoundError, ValidationError } from "@api/lib/errors";
import { buildPatchActivity } from "@api/lib/activity-helpers";
import { logDocumentPatched } from "@api/lib/activity";
import { computeDocumentTotals } from "@api/lib/document-totals";
import { fromQuantity } from "@api/lib/quantity";
import { replaceItemsAndComputeTotalsInPatchTx } from "@api/modules/documents/line-items";
import { UpdateDocumentBody } from "@api/modules/documents/model";
import { documentToWire } from "@api/modules/documents/wire";
import { documents, documentItems, documentVersions } from "@mana/db";
import { validateDocumentAmounts, type DocumentCreateValidationIssue } from "@mana/db/document-create-validation";
import { and, eq, isNull, max } from "drizzle-orm";
import type { Static } from "elysia";

type DocumentPatchFields = Static<typeof UpdateDocumentBody>;
const VALIDATION_MESSAGES: Record<DocumentCreateValidationIssue, string> = {
  "document-type-invalid": "type must be QO, INV, or RC",
  "sender-required": "A sender profile or sender name is required",
  "client-name-required": "Client name is required",
  "client-phone-required": "Client phone is required",
  "item-required": "Add at least one line item",
  "due-before-issue": "Due date cannot be before issue date",
  "discount-negative": "Discount cannot be negative",
  "rate-out-of-range": "Tax and withholding rates must be between 0% and 100%",
  "item-amount-required": "At least one line item needs a positive amount",
  "item-quantity-required": "Every line item needs a positive quantity",
  "item-quantity-fractional": "Line item quantities must be whole numbers",
  "item-amount-negative": "Line item amounts cannot be negative",
  "project-required": "projectId is required for INV and RC",
  "recurring-interval-required": "Select a recurring interval",
};
const DOCUMENT_PATCH_SCALAR_KEYS: readonly (keyof Omit<DocumentPatchFields, "items">)[] = [
  "projectId", "contactId", "currency", "documentLanguage", "issueDate", "dueDate", "discountCents", "taxRateBps", "whtRateBps", "vatRegistered", "remark", "registeredName", "registeredNameEn", "yourEmail", "yourPhone", "registeredAddress", "registeredAddressEn", "yourCountry", "yourZip", "yourTaxId", "yourBranchNumber", "yourLogo", "signatureImage", "signaturePlacement", "clientName", "clientNameTh", "clientEmail", "clientPhone", "clientAddress", "clientAddressTh", "clientCountry", "clientZip", "clientTaxId", "clientBranchNumber", "bankName", "accountNumber", "accountName", "swiftCode", "promptPayId", "cardNumber", "cardExpiry", "cardholderName", "isRecurring", "recurringInterval",
] as const;

function patchSet(
  body: DocumentPatchFields,
  totals: ReturnType<typeof computeDocumentTotals> | undefined,
  existing: { issueDate: string | null; type: string },
): Partial<typeof documents.$inferInsert> {
  const patch: Partial<typeof documents.$inferInsert> = { updatedAt: new Date() };
  for (const key of DOCUMENT_PATCH_SCALAR_KEYS) if (body[key] !== undefined) (patch as Record<string, unknown>)[key] = body[key];
  if (body.signatureEnabled !== undefined) patch.signatureEnabled = existing.type === "INV" ? body.signatureEnabled : false;
  if (body.isRecurring !== undefined || body.recurringInterval !== undefined) {
    const issueDate = body.issueDate ?? existing.issueDate ?? todayCalendarDate();
    const interval = body.recurringInterval ?? null;
    patch.nextGenerationDate = body.isRecurring ?? false
      ? interval ? addCalendarMonths(issueDate, interval === "yearly" ? 12 : interval === "quarterly" ? 3 : 1) : null
      : null;
  }
  if (totals) Object.assign(patch, totals);
  return patch;
}

export async function patchDocument(userId: string, id: string, body: DocumentPatchFields) {
  const [existing] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)));
  if (!existing) throw new NotFoundError();
  const issues = validateDocumentAmounts({
    issueDate: body.issueDate === undefined ? existing.issueDate : body.issueDate,
    dueDate: body.dueDate === undefined ? existing.dueDate : body.dueDate,
    discountCents: body.discountCents,
    taxRateBps: body.taxRateBps,
    whtRateBps: body.whtRateBps,
    items: body.items?.map((item) => ({ quantity: fromQuantity(item.quantity), unitPriceCents: item.unitPriceCents })),
  });
  if (issues.length > 0) throw new ValidationError(issues.map((issue) => VALIDATION_MESSAGES[issue]).join(". "));

  const existingItems = await db.select().from(documentItems).where(eq(documentItems.documentId, id)).orderBy(documentItems.position);
  const [version] = await db.select({ v: max(documentVersions.version) }).from(documentVersions).where(eq(documentVersions.documentId, id));
  await db.insert(documentVersions).values({ documentId: id, version: (version?.v ?? 0) + 1, snapshotJson: JSON.stringify({ document: existing, items: existingItems }) });

  return db.transaction(async (tx) => {
    const totals = await replaceItemsAndComputeTotalsInPatchTx(tx, id, body, existing, existingItems);
    const patch = patchSet(body, totals, existing);
    const [updated] = await tx.update(documents).set(patch).where(eq(documents.id, id)).returning();
    const updatedItems = await tx.select().from(documentItems).where(eq(documentItems.documentId, id)).orderBy(documentItems.position);
    const changedKeys = Object.keys(patch).filter((key) => key !== "updatedAt");
    const activity = buildPatchActivity(changedKeys, patch, existing, {
      statusActions: { overdue: { action: "overdue", summaryKey: "activity:document.overdue" } },
      fallbackSummaryKey: () => ({ summaryKey: "activity:document.patched" }),
    });
    if (activity) logDocumentPatched(existing, userId, changedKeys, activity.action, activity.metadata);
    return documentToWire(updated, updatedItems);
  });
}
