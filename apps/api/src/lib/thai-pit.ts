/**
 * Thai personal income tax — the progressive brackets in force since tax year 2017.
 * Thresholds are stated in baht and scaled at use, because MANA stores satang.
 */
const PIT_BRACKETS: { upToBaht: number; rate: number }[] = [
  { upToBaht: 150_000, rate: 0 },
  { upToBaht: 300_000, rate: 0.05 },
  { upToBaht: 500_000, rate: 0.1 },
  { upToBaht: 750_000, rate: 0.15 },
  { upToBaht: 1_000_000, rate: 0.2 },
  { upToBaht: 2_000_000, rate: 0.25 },
  { upToBaht: 5_000_000, rate: 0.3 },
  { upToBaht: Infinity, rate: 0.35 },
]

/**
 * ค่าลดหย่อนส่วนตัว — the ฿60,000 allowance every resident taxpayer gets.
 * Spouse, children, insurance and provident fund are not modelled because MANA
 * never asks for them. That biases the estimate high, which is the safe
 * direction for a set-aside: too much held back beats too little.
 */
export const PERSONAL_ALLOWANCE_SATANG = 60_000 * 100

/**
 * Estimated annual PIT on net income — revenue minus the expenses actually
 * logged, which is the "actual expense" method every taxpayer may use.
 *
 * The standard 60% deduction is deliberately not applied: electing it depends
 * on which section 40 category the income falls under, and MANA has no concept
 * of that. Guessing would produce a number the user cannot check.
 */
export function estimateThaiIncomeTax(netIncomeSatang: number): number {
  let remaining = netIncomeSatang - PERSONAL_ALLOWANCE_SATANG
  if (remaining <= 0) return 0

  let tax = 0
  let lowerBaht = 0
  for (const { upToBaht, rate } of PIT_BRACKETS) {
    const slice = Math.min(remaining, (upToBaht - lowerBaht) * 100)
    tax += slice * rate
    remaining -= slice
    lowerBaht = upToBaht
    if (remaining <= 0) break
  }

  return Math.round(tax)
}
