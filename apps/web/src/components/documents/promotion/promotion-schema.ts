import { addCalendarDays } from "@/lib/calendar-date";
import { z } from "zod";

export const PAYMENT_TERM_PRESETS = [
  { id: "net7", days: 7 },
  { id: "net14", days: 14 },
  { id: "net15", days: 15 },
  { id: "net30", days: 30 },
  { id: "net60", days: 60 },
] as const;

export type PaymentTermPresetId = (typeof PAYMENT_TERM_PRESETS)[number]["id"];

/** Recomputes the due date from an issue date for a Net-N style term. */
export function dueDateForTerm(
  issueDate: string,
  presetId: PaymentTermPresetId,
): string {
  const preset = PAYMENT_TERM_PRESETS.find((p) => p.id === presetId);
  return addCalendarDays(issueDate, preset?.days ?? 0);
}

export const qoToInvSchema = z
  .object({
    issueDate: z.string().min(1),
    dueDate: z.string().min(1),
    paymentTermPreset: z
      .enum(
        PAYMENT_TERM_PRESETS.map((p) => p.id) as [
          PaymentTermPresetId,
          ...PaymentTermPresetId[],
        ],
      )
      .nullable(),
    paymentTermsText: z.string().nullable(),
    whtRateBps: z.number(),
    remark: z.string().nullable(),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    message: "dueBeforeIssue",
    path: ["dueDate"],
  });

export type QoToInvValues = z.infer<typeof qoToInvSchema>;

export const invToRcSchema = z.object({
  paidAt: z.string().min(1),
  remark: z.string().nullable(),
  whtCertNumber: z.string().nullable(),
});

export type InvToRcValues = z.infer<typeof invToRcSchema>;

/** Field-level validity for the current step; drives the Next button gate. */
export function qoStepValid(step: number, values: QoToInvValues): boolean {
  if (step === 0) {
    return (
      values.issueDate.length > 0 &&
      values.dueDate.length > 0 &&
      values.dueDate >= values.issueDate
    );
  }
  return true;
}

export function rcStepValid(
  step: number,
  values: InvToRcValues,
  invoiceIssueDate?: string | null,
): boolean {
  if (step === 0) {
    return (
      values.paidAt.length > 0 &&
      (!invoiceIssueDate || values.paidAt >= invoiceIssueDate)
    );
  }
  return true;
}
