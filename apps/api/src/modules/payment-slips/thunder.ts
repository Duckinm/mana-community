import { env } from '@api/env'

export type ThunderVerifyResult =
  | { ok: true; transRef: string; amountCents: number; raw: unknown }
  | { ok: false; code: string; message: string }

export interface ThunderExpectedRecipient {
  accountNumber: string | null
  promptPayId: string | null
}

// Tight tolerance for "matches" — extraction rounding, not a real amount discrepancy.
const AMOUNT_TOLERANCE_CENTS = 1

export function isThunderConfigured(): boolean {
  return Boolean(env.THUNDER_API_KEY)
}

/**
 * Thunder masks receiver account numbers (e.g. "xxx-x-x5678-x"). We can't reconstruct the
 * full number, so match on the longest unmasked digit run instead of an exact comparison.
 */
function maskedAccountMatches(masked: string, actual: string): boolean {
  const runs = masked.match(/\d{3,}/g)
  if (!runs || runs.length === 0) return false
  const longest = runs.reduce((a, b) => (b.length > a.length ? b : a))
  return actual.replace(/\D/g, '').includes(longest)
}

/** Verifies a decoded PromptPay QR string against Thunder Solution's real bank-side API. */
export async function verifySlipViaThunder(
  qrRawText: string,
  expectedAmountCents: number,
  expectedRecipient: ThunderExpectedRecipient,
): Promise<ThunderVerifyResult> {
  if (!isThunderConfigured()) return { ok: false, code: 'not_configured', message: 'Thunder Solution is not configured' }
  try {
    const res = await fetch('https://api.thunder.in.th/v2/verify/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.THUNDER_API_KEY}` },
      body: JSON.stringify({ payload: qrRawText }),
      signal: AbortSignal.timeout(10_000),
    })
    const body: any = await res.json().catch(() => null)
    if (!res.ok || !body || body.success === false) {
      return { ok: false, code: String(body?.error?.code ?? res.status), message: body?.error?.message ?? 'Thunder Solution verification failed' }
    }
    // Thunder verifies the slip is real but doesn't match it against an expected amount — we do that ourselves.
    // The confirmed amount/ref live under data.rawSlip, not at the response root.
    const rawSlip = body.data?.rawSlip
    const rawAmount = rawSlip?.amount?.amount ?? body.data?.amountInSlip
    const amountCents = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) : NaN
    if (!Number.isFinite(amountCents) || Math.abs(amountCents - expectedAmountCents) > AMOUNT_TOLERANCE_CENTS) {
      return { ok: false, code: 'amount_mismatch', message: 'Verified slip amount does not match the document amount due' }
    }

    // Only reject on a receiver mismatch when Thunder actually returned receiver info AND the
    // document has a payment identifier to compare it against — otherwise there's nothing to check.
    const receiverAccount: string | undefined = rawSlip?.receiver?.account?.bank?.account
    const candidates = [expectedRecipient.accountNumber, expectedRecipient.promptPayId].filter(
      (v): v is string => !!v,
    )
    if (receiverAccount && candidates.length > 0) {
      const matches = candidates.some((candidate) => maskedAccountMatches(receiverAccount, candidate))
      if (!matches) {
        return { ok: false, code: 'recipient_mismatch', message: "Verified slip recipient does not match this document's payment details" }
      }
    }

    return { ok: true, transRef: rawSlip?.transRef ?? '', amountCents, raw: body }
  } catch (err) {
    return { ok: false, code: 'api_error', message: err instanceof Error ? err.message : 'Thunder Solution request failed' }
  }
}
