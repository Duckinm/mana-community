import { db } from "@api/db";
import { todayCalendarDate, addCalendarMonths } from "@api/lib/calendar-date";
import { ValidationError } from "@api/lib/errors";
import { computeDocumentTotals } from "@api/lib/document-totals";
import { fromQuantity } from "@api/lib/quantity";
import { copyDocumentImage } from "@api/modules/documents/images";
import { generateDocumentNumber } from "@api/modules/documents/document-number";
import {
  documentItemRowsForInsert,
  itemsWithSubtotalsFromBodies,
  type ItemBody,
} from "@api/modules/documents/line-items";
import { CreateDocumentBody } from "@api/modules/documents/model";
import { documentToWire } from "@api/modules/documents/wire";
import { logDocumentCreated } from "@api/lib/activity";
import { contacts, documents, documentItems, projects, senderProfiles } from "@mana/db";
import {
  validateDocumentCreate,
  type DocumentCreateValidationIssue,
} from "@mana/db/document-create-validation";
import { and, eq } from "drizzle-orm";
import type { Static } from "elysia";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DocumentCreateFields = Omit<Static<typeof CreateDocumentBody>, "items">;
type DocumentCreateBody = DocumentCreateFields & { items: ItemBody[] };

const DOCUMENT_CREATE_VALIDATION_MESSAGES: Record<
  DocumentCreateValidationIssue,
  string
> = {
  "document-type-invalid": "type must be QO, INV, or RC",
  "sender-required": "A sender profile or sender name is required",
  "client-name-required": "Client name is required",
  "client-phone-required": "Client phone is required",
  "item-required": "Add at least one line item",
  "item-quantity-required": "Every line item needs a positive quantity",
  "item-quantity-fractional": "Line item quantities must be whole numbers",
  "item-amount-required": "At least one line item needs a positive amount",
  "item-amount-negative": "Line item amounts cannot be negative",
  "discount-negative": "Discount cannot be negative",
  "rate-out-of-range": "Tax and withholding rates must be between 0% and 100%",
  "project-required": "projectId is required for INV and RC",
  "recurring-interval-required": "Select a recurring interval",
  "due-before-issue": "Due date cannot be before issue date",
};

function throwOnIssues(issues: DocumentCreateValidationIssue[]) {
  if (issues.length > 0) {
    throw new ValidationError(
      issues.map((issue) => DOCUMENT_CREATE_VALIDATION_MESSAGES[issue]).join(". "),
    );
  }
}

function assertValidDocumentCreate(body: DocumentCreateBody) {
  throwOnIssues(
    validateDocumentCreate({
      type: body.type,
      senderProfileId: body.senderProfileId,
      registeredName: body.registeredName,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      projectId: body.projectId,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      discountCents: body.discountCents,
      taxRateBps: body.taxRateBps,
      whtRateBps: body.whtRateBps,
      isRecurring: body.isRecurring,
      recurringInterval: body.recurringInterval,
      items: body.items.map((item) => ({
        description: item.description,
        quantity: fromQuantity(item.quantity),
        unitPriceCents: item.unitPriceCents,
      })),
    }),
  );
}

async function resolveDocumentCreateBody(
  userId: string,
  body: DocumentCreateBody,
): Promise<DocumentCreateBody> {
  const [senderProfile, contact, project] = await Promise.all([
    body.senderProfileId
      ? db.select().from(senderProfiles).where(and(eq(senderProfiles.id, body.senderProfileId), eq(senderProfiles.userId, userId))).limit(1).then(([row]) => row ?? null)
      : Promise.resolve(null),
    body.contactId
      ? db.select().from(contacts).where(and(eq(contacts.id, body.contactId), eq(contacts.userId, userId))).limit(1).then(([row]) => row ?? null)
      : Promise.resolve(null),
    body.projectId
      ? db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, body.projectId), eq(projects.userId, userId))).limit(1).then(([row]) => row ?? null)
      : Promise.resolve(null),
  ]);

  if (body.senderProfileId && !senderProfile) throw new ValidationError("senderProfileId must refer to one of your sender profiles");
  if (body.contactId && !contact) throw new ValidationError("contactId must refer to one of your contacts");
  if (body.projectId && !project) throw new ValidationError("projectId must refer to one of your projects");

  return {
    ...body,
    documentLanguage: body.documentLanguage ?? senderProfile?.documentLanguage,
    taxRateBps: body.taxRateBps ?? (senderProfile?.vatRegistered ? senderProfile.defaultTaxRateBps : undefined),
    vatRegistered: body.vatRegistered ?? senderProfile?.vatRegistered,
    remark: body.remark ?? senderProfile?.defaultRemark,
    registeredName: body.registeredName ?? senderProfile?.registeredName ?? senderProfile?.name,
    registeredNameEn: body.registeredNameEn ?? senderProfile?.registeredNameEn,
    yourEmail: body.yourEmail ?? senderProfile?.yourEmail,
    yourPhone: body.yourPhone ?? senderProfile?.yourPhone,
    registeredAddress: body.registeredAddress ?? senderProfile?.registeredAddress,
    registeredAddressEn: body.registeredAddressEn ?? senderProfile?.registeredAddressEn,
    yourCountry: body.yourCountry ?? senderProfile?.yourCountry,
    yourZip: body.yourZip ?? senderProfile?.yourZip,
    yourTaxId: body.yourTaxId ?? senderProfile?.yourTaxId,
    yourBranchNumber: body.yourBranchNumber ?? senderProfile?.yourBranchNumber,
    clientName: body.clientName ?? contact?.companyNameEn ?? contact?.name,
    clientNameTh: body.clientNameTh ?? contact?.companyNameTh ?? contact?.nameTh,
    clientEmail: body.clientEmail ?? contact?.email,
    clientPhone: body.clientPhone ?? contact?.phone,
    clientAddress: body.clientAddress ?? contact?.address,
    clientAddressTh: body.clientAddressTh ?? contact?.addressTh,
    clientCountry: body.clientCountry ?? contact?.country,
    clientZip: body.clientZip ?? contact?.zip,
    clientTaxId: body.clientTaxId ?? contact?.taxId ?? contact?.nationalId,
    clientBranchNumber: body.clientBranchNumber ?? contact?.branchNumber,
  };
}

function advanceByInterval(date: string, interval: "monthly" | "quarterly" | "yearly") {
  return addCalendarMonths(date, interval === "yearly" ? 12 : interval === "quarterly" ? 3 : 1);
}

function newDocumentRowFromBody(
  userId: string,
  body: DocumentCreateFields,
  number: string,
  totals: ReturnType<typeof computeDocumentTotals>,
) {
  return {
    userId,
    type: body.type,
    number,
    projectId: body.projectId ?? null,
    contactId: body.contactId ?? null,
    currency: body.currency ?? "THB",
    documentLanguage: body.documentLanguage ?? "th",
    issueDate: body.issueDate ?? todayCalendarDate(),
    dueDate: body.dueDate ?? null,
    discountCents: body.discountCents ?? 0,
    taxRateBps: body.taxRateBps ?? 0,
    whtRateBps: body.whtRateBps ?? 0,
    senderProfileId: body.senderProfileId ?? null,
    vatRegistered: body.vatRegistered ?? false,
    remark: body.remark ?? null,
    registeredName: body.registeredName ?? null,
    registeredNameEn: body.registeredNameEn ?? null,
    yourEmail: body.yourEmail ?? null,
    yourPhone: body.yourPhone ?? null,
    registeredAddress: body.registeredAddress ?? null,
    registeredAddressEn: body.registeredAddressEn ?? null,
    yourCountry: body.yourCountry ?? null,
    yourZip: body.yourZip ?? null,
    yourTaxId: body.yourTaxId ?? null,
    yourBranchNumber: body.yourBranchNumber ?? null,
    yourLogo: body.yourLogo ?? null,
    signatureImage: body.signatureImage ?? null,
    signatureEnabled: body.type === "INV" ? (body.signatureEnabled ?? false) : false,
    signaturePlacement: body.signaturePlacement ?? null,
    clientName: body.clientName ?? null,
    clientNameTh: body.clientNameTh ?? null,
    clientEmail: body.clientEmail ?? null,
    clientPhone: body.clientPhone ?? null,
    clientAddress: body.clientAddress ?? null,
    clientAddressTh: body.clientAddressTh ?? null,
    clientCountry: body.clientCountry ?? null,
    clientZip: body.clientZip ?? null,
    clientTaxId: body.clientTaxId ?? null,
    clientBranchNumber: body.clientBranchNumber ?? null,
    bankName: body.bankName ?? null,
    accountNumber: body.accountNumber ?? null,
    accountName: body.accountName ?? null,
    swiftCode: body.swiftCode ?? null,
    promptPayId: body.promptPayId ?? null,
    cardNumber: body.cardNumber ?? null,
    cardExpiry: body.cardExpiry ?? null,
    cardholderName: body.cardholderName ?? null,
    isRecurring: body.isRecurring ?? false,
    recurringInterval: body.recurringInterval ?? null,
    nextGenerationDate: body.isRecurring && body.recurringInterval
      ? advanceByInterval(body.issueDate ?? todayCalendarDate(), body.recurringInterval)
      : null,
    ...totals,
  };
}

async function inheritProfileImages(
  tx: DbTransaction,
  userId: string,
  doc: typeof documents.$inferSelect,
  senderProfileId: string | null | undefined,
): Promise<typeof documents.$inferSelect> {
  if (!senderProfileId) return doc;
  const [profile] = await tx.select({ yourLogo: senderProfiles.yourLogo, signatureImage: senderProfiles.signatureImage, signaturePlacement: senderProfiles.signaturePlacement }).from(senderProfiles).where(and(eq(senderProfiles.id, senderProfileId), eq(senderProfiles.userId, userId)));
  if (!profile) return doc;

  const [yourLogo, signatureImage] = await Promise.all([
    copyDocumentImage(profile.yourLogo, doc.id, "logo"),
    copyDocumentImage(profile.signatureImage, doc.id, "signature"),
  ]);
  const [updated] = await tx.update(documents).set({ yourLogo, signatureImage, signaturePlacement: profile.signaturePlacement }).where(eq(documents.id, doc.id)).returning();
  return updated ?? doc;
}

export async function createDocument(userId: string, body: DocumentCreateBody) {
  const resolvedBody = await resolveDocumentCreateBody(userId, body);
  assertValidDocumentCreate(resolvedBody);
  const number = await generateDocumentNumber(userId, resolvedBody.type);
  const itemsWithSubtotals = itemsWithSubtotalsFromBodies(resolvedBody.items);
  const totals = computeDocumentTotals({
    items: itemsWithSubtotals,
    taxRateBps: resolvedBody.taxRateBps ?? 0,
    discountCents: resolvedBody.discountCents ?? 0,
    whtRateBps: resolvedBody.whtRateBps ?? 0,
  });

  return db.transaction(async (tx) => {
    let doc = (await tx.insert(documents).values(newDocumentRowFromBody(userId, resolvedBody, number, totals)).returning())[0];
    doc = await inheritProfileImages(tx, userId, doc, resolvedBody.senderProfileId);
    const items = itemsWithSubtotals.length > 0
      ? await tx.insert(documentItems).values(documentItemRowsForInsert(doc.id, itemsWithSubtotals)).returning()
      : [];
    logDocumentCreated(doc, userId);
    return documentToWire(doc, items);
  });
}
