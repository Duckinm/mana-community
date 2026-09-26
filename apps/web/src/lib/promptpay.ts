import generatePayload from 'promptpay-qr'

export function promptPayPayload(promptPayId: string, amountDueCents: number): string {
  return generatePayload(promptPayId, { amount: amountDueCents / 100 })
}
