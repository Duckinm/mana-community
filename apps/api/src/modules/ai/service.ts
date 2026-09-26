import Anthropic from "@anthropic-ai/sdk";
import { projects } from "@mana/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@api/db";
import { env } from "@api/env";
import { todayCalendarDate } from "@api/lib/calendar-date";
import { tiptapDocToText } from "@api/lib/rich-text";
import { toVisionJpegBase64 } from "@api/lib/vision-image";
import { computeLifetimeFinancialSummary } from "@api/utils/financial-summary";
import { trackedCreate } from "@api/modules/ai/client";
import { listContacts } from "@api/modules/contacts/service";

/** Unwrap an Anthropic APIError's nested message (e.g. billing errors) instead of its verbose stringified body. */
export function aiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    const nested = (err.error as { error?: { message?: string } } | undefined)
      ?.error?.message;
    if (nested) return nested;
  }
  return err instanceof Error ? err.message : "AI error";
}

export function parseJsonObject<T>(
  raw: string,
  pattern: RegExp,
  label: string,
): T {
  const m = raw.match(pattern);
  if (!m) throw new Error(`No JSON in ${label}`);
  try {
    return JSON.parse(m[0]) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON in ${label}: ${msg}`);
  }
}

export interface GeneratedTask {
  title: string;
  priority: "low" | "med" | "high";
  status: "todo" | "in-progress";
  due: string;
}

export const receiptFlags = [
  "uncertain_currency",
  "uncertain_amount",
  "unclear_image",
] as const;
export type ReceiptFlag = (typeof receiptFlags)[number];

const receiptTransactionSchema = z.object({
  type: z.enum(["revenue", "expense"]).catch("expense"),
  amount: z.coerce.number().positive(),
  description: z.string().min(1).max(120),
  category: z.string().catch(""),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .catch(todayCalendarDate()),
  currency: z.string().length(3).catch("USD"),
  reference: z.string().optional().catch(undefined),
  notes: z.string().optional().catch(undefined),
  flags: z.array(z.enum(receiptFlags)).catch([]),
});

export type ReceiptTransactionDraft = z.infer<typeof receiptTransactionSchema>;

const receiptMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
type ReceiptMediaType = (typeof receiptMediaTypes)[number];

function isReceiptMediaType(value: string): value is ReceiptMediaType {
  return (receiptMediaTypes as readonly string[]).includes(value);
}

export async function extractReceiptTransaction(
  userId: string,
  file: File,
  baseCurrency: string,
): Promise<ReceiptTransactionDraft> {
  if (!isReceiptMediaType(file.type)) {
    throw new Error("Receipt import supports JPG, PNG, WebP, or GIF images");
  }

  const data = await toVisionJpegBase64(Buffer.from(await file.arrayBuffer()));
  const today = todayCalendarDate();
  const prompt = [
    "Extract one bookkeeping transaction from this receipt or bill.",
    `Today is ${today}. The user's base currency is ${baseCurrency}.`,
    "Return ONLY JSON with this shape:",
    '{ "type": "revenue"|"expense", "amount": number, "description": string, "category": string, "date": "YYYY-MM-DD", "currency": "USD", "reference": string, "notes": string, "flags": string[] }',
    'For supermarket, grocery, restaurant, software, travel, office, or vendor bills, use type "expense".',
    "Use the final paid total as amount.",
    `If the currency symbol or text is ambiguous or missing, default currency to ${baseCurrency} and add "uncertain_currency" to flags.`,
    'If the total amount is ambiguous (e.g. multiple totals, illegible number, unclear which line is the final total), add "uncertain_amount" to flags.',
    'If the receipt image is blurry, cropped, or otherwise hard to read, add "unclear_image" to flags.',
    "Leave flags as an empty array when you are confident. Keep description under 120 characters.",
  ].join("\n");

  const response = await trackedCreate(userId, {
    model: env.AI_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  return parseReceiptDraft(response.content.find((b) => b.type === "text")?.text);
}

/** Zod's own message is a JSON dump of its issue list — never let it reach the user's toast. */
export function parseReceiptDraft(
  text: string | undefined,
): ReceiptTransactionDraft {
  if (!text?.trim()) {
    throw new Error("Could not read this receipt. Add the transaction manually.");
  }

  const parsed = receiptTransactionSchema.safeParse(
    parseJsonObject<unknown>(text, /\{[\s\S]*\}/, "receipt extraction"),
  );
  if (!parsed.success) {
    throw new Error(
      "Could not read an amount and description from this receipt. Add the transaction manually.",
    );
  }

  return parsed.data;
}

/** Generate a list of tasks for a project given a plain-text brief */
export async function generateTasksFromBrief(
  userId: string,
  projectId: string,
  brief: string,
): Promise<GeneratedTask[]> {
  const [project] = await db
    .select({
      name: projects.name,
      client: projects.client,
      description: projects.description,
      dueDate: projects.dueDate,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!project) throw new Error("Project not found");

  const today = todayCalendarDate();

  const prompt = [
    `You are a project planning assistant for a freelancer.`,
    `Project: "${project.name}" for client "${project.client}".`,
    project.description
      ? `Description: ${tiptapDocToText(project.description)}`
      : "",
    project.dueDate ? `Due: ${project.dueDate}` : "",
    `Today: ${today}`,
    ``,
    `Based on this brief, generate a concrete list of actionable tasks:`,
    `"${brief}"`,
    ``,
    `Respond with ONLY a JSON array (no markdown). Each item has:`,
    `{ "title": string, "priority": "low"|"med"|"high", "status": "todo"|"in-progress", "due": "YYYY-MM-DD or empty string" }`,
    `Generate 5–12 tasks. Be specific and actionable.`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await trackedCreate(userId, {
    model: env.AI_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "[]";
  return parseJsonObject<GeneratedTask[]>(
    text,
    /\[[\s\S]*\]/,
    "AI response (task list)",
  );
}

/** Generate an outreach/follow-up message draft for a contact */
export async function generateOutreachDraft(
  userId: string,
  contactName: string,
  purpose: string,
  context: string,
): Promise<{ subject: string; body: string }> {
  const prompt = [
    `You are writing a professional outreach email for a freelancer.`,
    `Contact: ${contactName}`,
    `Purpose: ${purpose}`,
    context ? `Context: ${context}` : "",
    ``,
    `Respond with ONLY a JSON object (no markdown):`,
    `{ "subject": string, "body": string }`,
    `Keep it concise, warm, and professional. Body should be 2–4 short paragraphs.`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await trackedCreate(userId, {
    model: env.AI_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  return parseJsonObject<{ subject: string; body: string }>(
    text,
    /\{[\s\S]*\}/,
    "AI response (outreach draft)",
  );
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/** Break a task into 3–8 concrete, actionable subtask checklist steps */
export async function breakDownTask(
  userId: string,
  taskTitle: string,
  taskDescription: string,
): Promise<ChecklistItem[]> {
  const prompt = [
    "You are a productivity assistant for a freelancer.",
    `Task: "${taskTitle}"`,
    taskDescription ? `Description: ${taskDescription}` : "",
    "",
    "Break this task into 3–8 concrete, actionable subtask steps.",
    "Respond with ONLY a JSON array (no markdown, no explanation):",
    '[{ "text": string }, ...]',
  ]
    .filter(Boolean)
    .join("\n");

  const response = await trackedCreate(userId, {
    model: env.AI_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "[]";
  const items = parseJsonObject<{ text: string }[]>(
    text,
    /\[[\s\S]*\]/,
    "checklist",
  );
  return items.map((item) => ({
    id: crypto.randomUUID(),
    text: item.text,
    done: false,
  }));
}

/** Query contacts using natural language via Claude */
export async function queryContacts(
  userId: string,
  question: string,
): Promise<string> {
  const contacts = await listContacts(userId);

  if (contacts.length === 0) {
    return "You don't have any contacts yet.";
  }

  const context = contacts
    .map((c) => {
      return [
        `Name: ${c.name}`,
        c.role ? `Role: ${c.role}` : null,
        c.company ? `Company: ${c.company}` : null,
        c.email ? `Email: ${c.email}` : null,
        `Relationship level: ${c.relationshipLevel}/5`,
        c.tags && c.tags.length > 0 ? `Tags: ${c.tags.join(", ")}` : null,
        c.lastContactedAt
          ? `Last contacted: ${new Date(c.lastContactedAt).toISOString().slice(0, 10)}`
          : "No contact logged",
        c.notes ? `Notes: ${c.notes}` : null,
      ]
        .filter(Boolean)
        .join(", ");
    })
    .join("\n");

  const response = await trackedCreate(userId, {
    model: env.AI_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a helpful assistant for a freelancer. Here are their contacts:\n\n${context}\n\nQuestion: ${question}\n\nAnswer concisely and helpfully.`,
      },
    ],
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "Unable to answer.";
}

/** Generate a plain-english cash flow narrative from financial data */
export async function generateFinanceNarrative(
  userId: string,
): Promise<{ headline: string; narrative: string; insights: string[] }> {
  const summary = await computeLifetimeFinancialSummary(userId);

  const prompt = [
    `You are a financial advisor for a freelancer.`,
    `Here is their financial summary:`,
    JSON.stringify(summary, null, 2),
    ``,
    `Write a brief financial health narrative. Respond with ONLY a JSON object (no markdown):`,
    `{ "headline": string (1 sentence), "narrative": string (2–3 sentences), "insights": string[] (3 bullet points) }`,
  ].join("\n");

  const response = await trackedCreate(userId, {
    model: env.AI_MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  return parseJsonObject<{
    headline: string;
    narrative: string;
    insights: string[];
  }>(text, /\{[\s\S]*\}/, "AI response (finance narrative)");
}
