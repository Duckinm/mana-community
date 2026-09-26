import type {
  TransactionStatus,
  TransactionType,
} from "@/components/finance/types";
import { CURRENCIES } from "@/hooks/use-currency";
import i18next from "@/lib/i18n";
import {
  Bank,
  Briefcase,
  Car,
  Coffee,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  House,
  Lightning,
  Megaphone,
  Package,
  Receipt,
  ShoppingBag,
  Sparkle,
  Tag,
  Wrench,
} from "@phosphor-icons/react";
import { z } from "zod";

function tm(key: string) {
  return i18next.t(`transactions.modal.errors.${key}`, { ns: "accounting" });
}

// Built per call, not at module load: i18next resolves the language after this
// module is imported, so a hoisted schema freezes English error messages.
export const transactionSchema = () =>
  z
    .object({
      type: z.enum(["revenue", "expense"]),
      amount: z
        .string()
        .min(1, tm("amountRequired"))
        .refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0, {
          message: tm("amountMustBePositive"),
        }),
      description: z
        .string()
        .min(1, tm("labelRequired"))
        .max(120, tm("labelTooLong")),
      category: z.string(),
      date: z.string().min(1, tm("dateRequired")),
      status: z.enum(["received", "pending", "overdue", "paid"]),
      walletId: z.string(),
      projectId: z.string(),
      reference: z.string().max(50, tm("refTooLong")),
      notes: z.string().max(500, tm("notesTooLong")),
      currency: z.string().min(1),
      isRecurring: z.boolean(),
      recurringInterval: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
      documentId: z.string(),
    })
    .refine((v) => v.type !== "expense" || v.category.trim().length > 0, {
      message: tm("categoryRequired"),
      path: ["category"],
    });

export type TransactionFormValues = z.infer<ReturnType<typeof transactionSchema>>;

export function revenueStatuses(): { value: TransactionStatus; label: string }[] {
  return [
    { value: "received", label: i18next.t("transactions.statusReceived", { ns: "accounting" }) },
    { value: "pending", label: i18next.t("transactions.statusPending", { ns: "accounting" }) },
    { value: "overdue", label: i18next.t("transactions.statusOverdue", { ns: "accounting" }) },
  ];
}

export function expenseStatuses(): { value: TransactionStatus; label: string }[] {
  return [
    { value: "paid", label: i18next.t("transactions.statusPaid", { ns: "accounting" }) },
    { value: "pending", label: i18next.t("transactions.statusPending", { ns: "accounting" }) },
  ];
}

export function statusesFor(type: TransactionType) {
  return type === "revenue" ? revenueStatuses() : expenseStatuses();
}

const CATEGORY_ICON_RULES: { match: RegExp; icon: typeof Tag }[] = [
  { match: /food|meal|coffee|restaurant|drink/, icon: Coffee },
  { match: /travel|transport|car|fuel|gas|flight|uber|taxi/, icon: Car },
  { match: /rent|home|office|utilit/, icon: House },
  { match: /software|subscription|saas|tool|hosting|domain/, icon: Wrench },
  { match: /market|advertis|ads|promo/, icon: Megaphone },
  { match: /shop|supply|supplies|equipment|hardware/, icon: ShoppingBag },
  { match: /salary|payroll|contractor|freelanc|wage/, icon: Briefcase },
  { match: /tax|vat|gov|fee|bank/, icon: Bank },
  { match: /health|medical|insurance/, icon: Heart },
  { match: /education|course|training|learn/, icon: GraduationCap },
  { match: /gift|donation|charity/, icon: Gift },
  { match: /internet|phone|telecom|web/, icon: Globe },
  { match: /electric|power|energy/, icon: Lightning },
  { match: /ship|delivery|package|freight/, icon: Package },
  { match: /invoice|receipt|billing/, icon: Receipt },
  { match: /misc|other/, icon: Sparkle },
];

export function categoryIcon(name: string): typeof Tag {
  const lower = name.toLowerCase();
  return CATEGORY_ICON_RULES.find((r) => r.match.test(lower))?.icon ?? Tag;
}

/**
 * Rank categories by how often they appear across the user's transaction
 * history so the icon grid surfaces the six most-used first. Falls back to the
 * budget-category order when no usage data is available.
 */
export function rankCategories(
  categories: string[],
  usage: Record<string, number>,
): string[] {
  return [...categories].sort((a, b) => {
    const diff = (usage[b.toLowerCase()] ?? 0) - (usage[a.toLowerCase()] ?? 0);
    if (diff !== 0) return diff;
    return categories.indexOf(a) - categories.indexOf(b);
  });
}

export function currencySymbol(code: string, fallback: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? fallback;
}

export function formatSignedAmount(
  amount: number,
  currencyCode: string,
  fallbackSymbol: string,
): string {
  const symbol = currencySymbol(currencyCode, fallbackSymbol);
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

/**
 * Categories are free text, except the ones the API writes itself (e.g. when an
 * invoice is receipted). Those are stored in English and translated on display.
 */
const SYSTEM_CATEGORY_KEYS: Record<string, string> = {
  "invoice payment": "transactions.systemCategory.invoicePayment",
};

export function categoryLabel(
  category: string,
  t: (key: string) => string,
): string {
  const key = SYSTEM_CATEGORY_KEYS[category.trim().toLowerCase()];
  return key ? t(key) : category;
}
