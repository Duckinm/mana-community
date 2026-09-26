export type DocumentTotalsInput = {
  items: { subtotalCents: number }[]
  taxRateBps: number
  discountCents: number
  whtRateBps: number
}

export type DocumentTotals = {
  subtotalCents: number
  taxCents: number
  totalCents: number
  whtCents: number
  amountDueCents: number
}

export function computeDocumentTotals(input: DocumentTotalsInput): DocumentTotals {
  const { items, taxRateBps, discountCents, whtRateBps } = input
  const subtotalCents = items.reduce((sum, i) => sum + i.subtotalCents, 0)
  // A discount larger than the subtotal would otherwise drag every derived total negative.
  const clampedDiscountCents = Math.min(discountCents, subtotalCents)
  const taxBaseCents = Math.max(subtotalCents - clampedDiscountCents, 0)
  const taxCents = Math.round(taxBaseCents * taxRateBps / 10000)
  const totalCents = Math.max(taxBaseCents + taxCents, 0)
  const whtCents = Math.round(taxBaseCents * whtRateBps / 10000)
  // amountDueCents is post-WHT (totalCents - whtCents), not pre-WHT subtotal minus WHT
  const amountDueCents = Math.max(totalCents - whtCents, 0)
  return { subtotalCents, taxCents, totalCents, whtCents, amountDueCents }
}
