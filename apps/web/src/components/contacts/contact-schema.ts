import i18next from "@/lib/i18n";
import { isValidThaiPhoneNumbers } from "@/lib/phone-numbers";
import { z } from "zod";

export const ENTITY_TYPES = ["individual", "company"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** 13 numeric digits after stripping non-digits. Used for Tax ID and National ID. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Thai Tax ID / National ID mod-11 check digit over the first 12 digits. */
export function isValidThaiId(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === Number(digits[12]);
}

/** Prepend https:// when a bare host is entered; leave empty and full URLs untouched. */
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const tContacts = (key: string, defaultValue: string) =>
  i18next.t(key, { ns: "contacts", defaultValue });

const optionalThaiId = z
  .string()
  .refine((v) => v.trim() === "" || isValidThaiId(v), {
    message: tContacts("persona.invalidThaiId", "Invalid ID — check digit failed"),
  });

export const contactSchema = z.object({
  name: z.string().min(1, tContacts("persona.nameRequired", "Name is required")),
  role: z.string(),
  company: z.string(),
  email: z
    .string()
    .email(tContacts("persona.invalidEmail", "Invalid email"))
    .or(z.literal("")),
  phone: z
    .string()
    .refine((v) => v.trim() === "" || isValidThaiPhoneNumbers(v), {
      message: tContacts("persona.invalidPhone", "Invalid phone number"),
    }),
  website: z.string(),
  metVia: z.string(),
  tags: z.string(),
  color: z.string(),
  entityType: z.enum(ENTITY_TYPES),
  companyNameEn: z.string(),
  companyNameTh: z.string(),
  taxId: optionalThaiId,
  nationalId: optionalThaiId,
  address: z.string(),
  addressTh: z.string(),
  zip: z.string(),
  country: z.string(),
  useSameAddress: z.boolean(),
  companyAddress: z.string(),
  companyAddressTh: z.string(),
  companyZip: z.string(),
  companyCountry: z.string(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

const AVATAR_COLORS = [
  "#4F6BDC",
  "#f87171",
  "#fbbf24",
  "#4ade80",
  "#a78bfa",
  "#fb923c",
  "#38bdf8",
  "#f472b6",
];

/** Deterministic avatar color derived from the contact name so it never changes across renders. */
export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function generateInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
