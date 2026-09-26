import { db } from "@api/db";
import { NotFoundError } from "@api/lib/errors";
import { overdueDocumentListConditions } from "@api/lib/document-status";
import {
  getLatestSlipStatus,
  getVisibleSlipStatusesByDocumentIds,
  listActivePaymentSlips,
} from "@api/modules/payment-slips/wire";
import { documentToWire, documentVersionToWire } from "@api/modules/documents/wire";
import { contacts, documents, documentItems, documentVersions } from "@mana/db";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";

export type DocumentListFilters = {
  type?: string;
  projectId?: string;
  status?: string;
  recurring?: boolean;
  paid?: "paid" | "unpaid";
  search?: string;
  from?: string;
  to?: string;
  sort?: "issueDateDesc";
  page?: number;
  limit?: number;
};

export async function getDocument(userId: string, id: string) {
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)));
  if (!doc) throw new NotFoundError();

  const [items, paymentSlips, latestPaymentSlipStatus] = await Promise.all([
    db.select().from(documentItems).where(eq(documentItems.documentId, id)).orderBy(documentItems.position),
    listActivePaymentSlips(id, userId),
    getLatestSlipStatus(id),
  ]);
  return documentToWire(doc, items, paymentSlips, latestPaymentSlipStatus);
}

async function updatePublicLink(userId: string, id: string, values: Partial<typeof documents.$inferInsert>) {
  const [updated] = await db
    .update(documents)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)))
    .returning({ id: documents.id });
  if (!updated) throw new NotFoundError();
  return getDocument(userId, id);
}

export function revokeDocumentPublicLink(userId: string, id: string) {
  return updatePublicLink(userId, id, { publicAccessRevokedAt: new Date() });
}

export function rotateDocumentPublicLink(userId: string, id: string) {
  return updatePublicLink(userId, id, {
    publicToken: crypto.randomUUID(),
    publicAccessRevokedAt: null,
    publicAccessRotatedAt: new Date(),
  });
}

export async function listDocuments(userId: string, filters: DocumentListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;
  const conditions = [eq(documents.userId, userId)];

  if (filters.status === "archived") conditions.push(isNotNull(documents.deletedAt));
  else {
    conditions.push(isNull(documents.deletedAt));
    if (filters.status === "overdue") conditions.push(overdueDocumentListConditions());
    else if (filters.status) conditions.push(eq(documents.status, filters.status));
  }
  if (filters.type) conditions.push(eq(documents.type, filters.type));
  if (filters.projectId) conditions.push(eq(documents.projectId, filters.projectId));
  if (filters.recurring) conditions.push(eq(documents.isRecurring, true));
  if (filters.paid === "paid") conditions.push(isNotNull(documents.paidAt));
  else if (filters.paid === "unpaid") conditions.push(isNull(documents.paidAt));
  if (filters.search) conditions.push(or(ilike(documents.clientName, `%${filters.search}%`), ilike(documents.number, `%${filters.search}%`))!);
  if (filters.from) conditions.push(gte(documents.issueDate, filters.from));
  if (filters.to) conditions.push(lte(documents.issueDate, filters.to));

  const where = and(...conditions);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(documents).where(where);
  const rows = await db.select().from(documents).where(where).orderBy(
    ...(filters.sort === "issueDateDesc"
      ? [sql`${documents.issueDate} desc nulls last`, desc(documents.updatedAt), desc(documents.id)]
      : [desc(documents.createdAt)]),
  ).limit(limit).offset(offset);
  const contactIds = [...new Set(rows.map((row) => row.contactId).filter((id): id is string => id !== null))];
  const existingContactIds = new Set<string>();
  if (contactIds.length > 0) {
    const found = await db.select({ id: contacts.id }).from(contacts).where(inArray(contacts.id, contactIds));
    for (const row of found) existingContactIds.add(row.id);
  }
  const slipStatuses = await getVisibleSlipStatusesByDocumentIds(rows.map((row) => row.id));
  const data = await Promise.all(rows.map(async (row) => ({
    ...(await documentToWire(row, undefined, undefined, slipStatuses.get(row.id) ?? null)),
    contactExists: row.contactId !== null && existingContactIds.has(row.contactId),
  })));
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function softDeleteDocument(userId: string, id: string) {
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)));
  if (!doc) throw new NotFoundError();
  await db.update(documents).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(documents.id, id));
}

export async function listVersions(userId: string, id: string) {
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
  if (!doc) throw new NotFoundError();
  const rows = await db.select().from(documentVersions).where(eq(documentVersions.documentId, id)).orderBy(desc(documentVersions.version));
  return rows.map(documentVersionToWire);
}

export async function listDocumentsByProject(userId: string, projectId: string) {
  const docs = await db.select().from(documents).where(and(eq(documents.userId, userId), eq(documents.projectId, projectId), isNull(documents.deletedAt))).orderBy(desc(documents.createdAt));
  const docIds = docs.map((doc) => doc.id);
  if (docIds.length === 0) return [];
  const items = await db.select().from(documentItems).where(inArray(documentItems.documentId, docIds)).orderBy(asc(documentItems.position));
  return Promise.all(docs.map((doc) => documentToWire(doc, items.filter((item) => item.documentId === doc.id))));
}
