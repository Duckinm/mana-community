import { documents, emailLogs } from "@mana/db";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@api/db";
import { env } from "@api/env";
import { NotFoundError } from "@api/lib/errors";
import { sendEmailBatch } from "@api/utils/email";
import { buildDocumentEmailHtml } from "@api/utils/email/document-email";

export type SendDocumentEmailResult =
  | { status: "sent" | "blocked" | "failed"; sentAt: string | null }
  | { status: "no_client_email"; sentAt: null };

function monthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function countDocumentsSentThisMonth(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.userId, userId),
        eq(emailLogs.type, "document_sent"),
        eq(emailLogs.status, "sent"),
        gte(emailLogs.sentAt, monthStartUtc()),
      ),
    );
  return row?.value ?? 0;
}

/** Email a Document's guest-view link to its client, logging the send to email_logs and (on success) updating sentAt + activity log */
export async function sendDocumentEmail(
  userId: string,
  documentId: string,
): Promise<SendDocumentEmailResult> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc || doc.userId !== userId) throw new NotFoundError();

  if (!doc.clientEmail) return { status: "no_client_email", sentAt: null };

  const viewUrl = `${env.WEB_URL}/view/${doc.publicToken}`;
  const { subject, html } = await buildDocumentEmailHtml(doc, viewUrl);

  const [result] = await sendEmailBatch([
    { to: doc.clientEmail, subject, html },
  ]);

  await db.insert(emailLogs).values({
    userId,
    recipient: result.to,
    subject,
    type: "document_sent",
    referenceId: documentId,
    status: result.status,
    resendId: result.resendId,
  });

  return { status: result.status, sentAt: null };
}
