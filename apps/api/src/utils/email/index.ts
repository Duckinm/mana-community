import { Resend } from "resend";
import * as Sentry from "@sentry/bun";
import { env } from "@api/env";
import { sendMailpitEmail } from "@api/utils/email/mailpit";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM = env.RESEND_FROM_EMAIL ?? (env.MAILPIT_URL ? "MANA <no-reply@mana.local>" : "MANA <onboarding@resend.dev>");

// The Resend SDK doesn't accept an AbortSignal — race it instead so a stalled
// request can't hang whatever job (cron, request handler) is sending email.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Resend request timed out")), ms).unref();
  });
  return Promise.race([promise, timeout]);
}
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  to: string;
  status: "sent" | "blocked" | "failed";
  resendId?: string;
  error?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SingleEmailPayload {
  from?: string;
  to: string;
  cc?: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

// resend.batch.send (above) doesn't support attachments or cc — use this for one-off sends
// (e.g. e-tax invoices) that need a PDF attached and/or a custom from address.
export async function sendEmailSingle(
  payload: SingleEmailPayload,
): Promise<EmailResult> {
  if (env.MAILPIT_URL) {
    return sendMailpitEmail(env.MAILPIT_URL, { ...payload, from: payload.from ?? FROM });
  }
  if (!resend) return { to: payload.to, status: "failed", error: "Email is not configured. Set MAILPIT_URL or RESEND_API_KEY." };

  const whitelist = new Set(
    (env.EMAIL_SANDBOX_WHITELIST ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (env.NODE_ENV !== "production" && !whitelist.has(payload.to.toLowerCase())) {
    return { to: payload.to, status: "blocked" };
  }
  // outside production, never CC unwhitelisted addresses (e.g. the live ETDA inbox)
  const ccList = payload.cc === undefined ? [] : Array.isArray(payload.cc) ? payload.cc : [payload.cc];
  const allowedCc = env.NODE_ENV === "production" ? ccList : ccList.filter((addr) => whitelist.has(addr.toLowerCase()));
  const cc = allowedCc.length > 0 ? allowedCc : undefined;

  try {
    const { data, error } = await withTimeout(
      resend.emails.send({
        from: payload.from ?? FROM,
        to: [payload.to],
        cc,
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
        })),
      }),
      15_000,
    );

    if (error) return { to: payload.to, status: "failed", error: error.message };
    if (!data) return { to: payload.to, status: "failed", error: "Provider returned no result" };
    return { to: payload.to, status: "sent", resendId: data.id };
  } catch (err) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : "Resend request timed out";
    return { to: payload.to, status: "failed", error: message };
  }
}

export async function sendEmailBatch(
  emails: EmailPayload[],
): Promise<EmailResult[]> {
  if (env.MAILPIT_URL) {
    const results: EmailResult[] = [];
    for (const email of emails) results.push(await sendMailpitEmail(env.MAILPIT_URL, { ...email, from: FROM }));
    return results;
  }
  if (!resend) return emails.map(({ to }) => ({ to, status: "failed", error: "Email is not configured. Set MAILPIT_URL or RESEND_API_KEY." }));

  const whitelist = new Set(
    (env.EMAIL_SANDBOX_WHITELIST ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const results: Array<EmailResult | undefined> = new Array(emails.length);
  const allowed: Array<{ email: EmailPayload; index: number }> = [];

  for (const [index, email] of emails.entries()) {
    if (env.NODE_ENV === "production" || whitelist.has(email.to.toLowerCase())) {
      allowed.push({ email, index });
    } else {
      results[index] = { to: email.to, status: "blocked" };
    }
  }

  if (allowed.length === 0) return results as EmailResult[];

  for (let offset = 0; offset < allowed.length; offset += 100) {
    const chunk = allowed.slice(offset, offset + 100);
    let sent: Awaited<ReturnType<typeof resend.batch.send>>;
    try {
      sent = await withTimeout(
        resend.batch.send(
          chunk.map(({ email }) => ({
            from: FROM,
            to: [email.to],
            subject: email.subject,
            html: email.html,
          })),
        ),
        15_000,
      );
    } catch (err) {
      Sentry.captureException(err);
      for (const { email, index } of chunk) {
        results[index] = { to: email.to, status: "failed", error: "Resend request timed out" };
      }
      continue;
    }
    const { data, error } = sent;

    for (const [chunkIndex, { email, index }] of chunk.entries()) {
      const providerResult = data?.data[chunkIndex];
      results[index] = error
        ? { to: email.to, status: "failed", error: error.message }
        : providerResult
          ? {
              to: email.to,
              status: "sent" as const,
              resendId: providerResult.id,
            }
          : {
              to: email.to,
              status: "failed",
              error: "Provider returned no result",
            };
    }
  }

  return results as EmailResult[];
}
