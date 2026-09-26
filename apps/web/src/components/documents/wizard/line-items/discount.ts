export function discountCentsFromPercent(percent: number, subtotalCents: number): number {
  const boundedPercent = Math.min(100, Math.max(0, percent))
  return Math.round(Math.max(0, subtotalCents) * boundedPercent / 100)
}

export function discountPercentFromCents(discountCents: number, subtotalCents: number): string {
  if (subtotalCents <= 0) return '0'
  const percent = Math.min(100, Math.max(0, discountCents) / subtotalCents * 100)
  return String(Number(percent.toFixed(2)))
}

export function clampDiscountCents(discountCents: number, subtotalCents: number): number {
  return Math.min(Math.max(0, subtotalCents), Math.max(0, Math.round(discountCents)))
}
