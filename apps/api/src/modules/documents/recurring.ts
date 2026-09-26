import { db } from "@api/db";
import { documentItems, documents, emailLogs, users } from "@mana/db";
import {
  addCalendarDays,
  addCalendarMonths,
  parseCalendarDate,
  todayCalendarDate,
} from "@api/lib/calendar-date";
import { logDocumentGenerated } from "@api/lib/activity";
import { notificationPreferenceEnabled } from "@api/modules/notifications/preferences";
import { documentToWire, type DocumentWire } from "@api/modules/documents/wire";
import { generateDocumentNumber } from "@api/modules/documents/document-number";
import { env } from "@api/env";
import { sendEmailBatch } from "@api/utils/email";
import { renderCatalogEmail } from "@api/utils/email/catalog";
import { sendLineNotification } from "@api/lib/line/notify";
import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";

function advanceByInterval(
  date: string,
  interval: "monthly" | "quarterly" | "yearly",
): string {
  const months = interval === "yearly" ? 12 : interval === "quarterly" ? 3 : 1;
  return addCalendarMonths(date, months);
}

export async function generateRecurringDocuments(asOf?: string) {
  const cutoff = asOf ?? todayCalendarDate();

  const templates = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.isRecurring, true),
        isNotNull(documents.nextGenerationDate),
        lte(documents.nextGenerationDate, cutoff),
        isNull(documents.deletedAt),
      ),
    );

  const generated: DocumentWire[] = [];
  const generatedByUser = new Map<string, number>();

  for (const template of templates) {
    if (!template.recurringInterval) continue;

    const items = await db
      .select()
      .from(documentItems)
      .where(eq(documentItems.documentId, template.id))
      .orderBy(documentItems.position);

    const number = await generateDocumentNumber(template.userId, template.type);
    const issueDate = template.nextGenerationDate!;
    const dueDate = shiftDueDate(
      template.issueDate,
      template.dueDate,
      issueDate,
    );

    const newDoc = await db.transaction(async (tx) => {
      const [doc] = await tx
        .insert(documents)
        .values({
          ...cloneableDocumentFields(template),
          number,
          status: "draft",
          issueDate,
          dueDate,
          validUntilDate: null,
          sentAt: null,
          clientStatus: null,
          clientApprovedAt: null,
          clientApprovalIp: null,
          paidAt: null,
          viewedAt: null,
          pdfR2Key: null,
          publicToken: crypto.randomUUID(),
          publicAccessRevokedAt: null,
          publicAccessRotatedAt: null,
          parentDocumentId: template.id,
          isRecurring: false,
          recurringInterval: null,
          nextGenerationDate: null,
        })
        .returning();

      if (items.length > 0) {
        await tx.insert(documentItems).values(
          items.map((item) => ({
            documentId: doc.id,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            subtotalCents: item.subtotalCents,
            position: item.position,
          })),
        );
      }

      await tx
        .update(documents)
        .set({
          nextGenerationDate: advanceByInterval(
            template.nextGenerationDate!,
            template.recurringInterval as "monthly" | "quarterly" | "yearly",
          ),
          updatedAt: new Date(),
        })
        .where(eq(documents.id, template.id));

      return doc;
    });

    logDocumentGenerated(
      { ...newDoc, templateNumber: template.number },
      template.userId,
    );
    generated.push(await documentToWire(newDoc, items));
    generatedByUser.set(
      template.userId,
      (generatedByUser.get(template.userId) ?? 0) + 1,
    );
  }

  for (const [userId, count] of generatedByUser) {
    const referenceId = `recurring:${cutoff}:${userId}`;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) continue;

    if (
      notificationPreferenceEnabled(
        user.notificationPreferences,
        "recurringDraftReady",
        "email",
      )
    ) {
      const [existing] = await db
        .select({ id: emailLogs.id })
        .from(emailLogs)
        .where(eq(emailLogs.referenceId, referenceId));
      if (!existing) {
        const rendered = await renderCatalogEmail("recurring-draft-ready", {
          recipientName: user.name || user.email.split("@")[0],
          draftCount: String(count),
          actionUrl: `${env.WEB_URL}/documents`,
        });
        const [result] = await sendEmailBatch([
          { to: user.email, subject: rendered.subject, html: rendered.html },
        ]);
        await db.insert(emailLogs).values({
          userId,
          recipient: user.email,
          subject: rendered.subject,
          type: "recurring-draft-ready",
          referenceId,
          status: result.status,
          resendId: result.resendId,
        });
      }
    }

    await sendLineNotification({
      userId,
      referenceId: `line:recurring:${cutoff}:${userId}`,
      type: "recurring-draft-ready",
      title: "Recurring drafts ready",
      status: `${count} recurring draft${count === 1 ? "" : "s"} ready for review.`,
      url: `${env.WEB_URL}/documents`,
      event: "recurringDraftReady",
    });
  }

  return generated;
}

/** Shift a recurring template's dueDate by the same number of days the issueDate moved. */
function shiftDueDate(
  oldIssueDate: string | null,
  oldDueDate: string | null,
  newIssueDate: string,
): string | null {
  if (!oldDueDate || !oldIssueDate) return oldDueDate;
  const oldIssue = parseCalendarDate(oldIssueDate);
  const oldDue = parseCalendarDate(oldDueDate);
  if (!oldIssue || !oldDue) return oldDueDate;
  const offsetDays = Math.round(
    (oldDue.getTime() - oldIssue.getTime()) / (1000 * 60 * 60 * 24),
  );
  return addCalendarDays(newIssueDate, offsetDays);
}

function cloneableDocumentFields(template: typeof documents.$inferSelect) {
  const { id, createdAt, updatedAt, deletedAt, ...rest } = template;
  return rest;
}
