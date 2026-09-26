/** Line-item quantity is stored ×100 (fixed-point) to represent fractional units without floats. */
export function toQuantity(qty: number): number {
  return Math.round(qty * 100)
}

export function fromQuantity(quantity: number): number {
  return quantity / 100
}
