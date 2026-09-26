import type { CardBrand } from "@/lib/payment-destination-schema";

export function WalletBrandMark({ brand }: { brand: CardBrand }) {
  if (brand === "visa") {
    return (
      <span className="font-serif text-lg italic font-bold tracking-tight text-white">
        VISA
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <svg width="34" height="22" viewBox="0 0 34 22" aria-label="Mastercard">
        <circle cx="13" cy="11" r="9" fill="#EB001B" opacity="0.9" />
        <circle cx="21" cy="11" r="9" fill="#F79E1B" opacity="0.85" />
      </svg>
    );
  }
  if (brand === "amex") {
    return (
      <span className="rounded bg-white/25 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
        Amex
      </span>
    );
  }
  if (brand === "jcb") {
    return (
      <span className="font-sans text-sm font-bold tracking-tight text-white">
        JCB
      </span>
    );
  }
  return null;
}
