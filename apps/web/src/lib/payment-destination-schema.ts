import { z } from "zod";

export const PAYMENT_DESTINATION_TYPES = [
  "bank_transfer",
  "card",
  "promptpay",
  "cash",
  "crypto",
  "other",
] as const;

export type PaymentDestinationType = (typeof PAYMENT_DESTINATION_TYPES)[number];

const SWIFT_BIC_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const TH_PHONE_PATTERN = /^0[689]\d{8}$/;
const TH_CITIZEN_ID_LENGTH = 13;
const CARD_EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;

export function isValidSwiftBic(value: string): boolean {
  return SWIFT_BIC_PATTERN.test(value.trim().toUpperCase());
}

/** PromptPay accepts a Thai mobile number (0[689]xxxxxxxx) or a 13-digit citizen ID. */
export function isValidPromptPayId(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (TH_PHONE_PATTERN.test(digits)) return true;
  return digits.length === TH_CITIZEN_ID_LENGTH && isValidThaiCitizenId(digits);
}

/** Thai national ID check-digit (mod 11) validation. */
export function isValidThaiCitizenId(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== TH_CITIZEN_ID_LENGTH) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === Number(digits[12]);
}

export function isValidCardExpiry(value: string): boolean {
  const match = value.trim().match(CARD_EXPIRY_PATTERN);
  if (!match) return false;
  const month = Number(value.slice(0, 2));
  const year = 2000 + Number(value.slice(3, 5));
  const now = new Date();
  const expiry = new Date(year, month, 0, 23, 59, 59, 999);
  return expiry.getTime() >= now.getTime();
}

/** Luhn checksum — rejects mistyped or fake card numbers. */
export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export type CardBrand = "visa" | "mastercard" | "amex" | "jcb" | "unknown";

/** Detect card brand from the BIN prefix. Returns "unknown" when no rule matches. */
export function detectCardBrand(value: string): CardBrand {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "unknown";
  if (/^4/.test(digits)) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^35/.test(digits)) return "jcb";
  const two = Number(digits.slice(0, 2));
  const four = Number(digits.slice(0, 4));
  if ((two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) {
    return "mastercard";
  }
  return "unknown";
}

const swiftField = z
  .string()
  .trim()
  .max(11)
  .optional()
  .refine((v) => !v || isValidSwiftBic(v), { message: "invalidSwift" });

const bankDestination = z.object({
  type: z.literal("bank_transfer"),
  bankName: z.string().trim().min(1, { message: "required" }).max(120),
  accountNumber: z.string().trim().min(1, { message: "required" }).max(34),
  accountName: z.string().trim().max(120).optional().default(""),
  swiftCode: swiftField,
});

const cardDestination = z.object({
  type: z.literal("card"),
  cardNumber: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .refine(isValidCardNumber, { message: "invalidCardNumber" }),
  cardExpiry: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .refine(isValidCardExpiry, { message: "invalidExpiry" }),
  cardholderName: z.string().trim().max(120).optional().default(""),
});

const promptPayDestination = z.object({
  type: z.literal("promptpay"),
  promptPayId: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .refine(isValidPromptPayId, { message: "invalidPromptPay" }),
});

const cashDestination = z.object({ type: z.literal("cash") });

const cryptoDestination = z.object({
  type: z.literal("crypto"),
  accountNumber: z.string().trim().max(120).optional().default(""),
});

const otherDestination = z.object({
  type: z.literal("other"),
  accountName: z.string().trim().max(120).optional().default(""),
});

export const paymentDestinationSchema = z.discriminatedUnion("type", [
  bankDestination,
  cardDestination,
  promptPayDestination,
  cashDestination,
  cryptoDestination,
  otherDestination,
]);

export type PaymentDestination = z.infer<typeof paymentDestinationSchema>;
