import { CURRENCIES } from "@/components/documents/ui/currency-combobox";

export function formatPrice(cents: number, currency: string): string {
  const sym = CURRENCIES.find((c) => c.value === currency)?.symbol ?? "$";
  return `${sym}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatQty(qty: number): string {
  const v = qty / 100;
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(2);
}
