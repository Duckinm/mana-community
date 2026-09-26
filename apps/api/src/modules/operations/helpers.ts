export interface CurrencyAmountInput {
  amount: number
  currency: string
}

export interface StripeSubscriptionInput {
  status: string
}

export interface StripePaymentInput {
  status: string
  amountReceived: number
  currency: string
  hasError: boolean
}

export interface ProviderResourceState {
  state: string
}

export function currencyAmounts(values: CurrencyAmountInput[]) {
  return values.map(({ amount, currency }) => ({ amount, currency: currency.toUpperCase() }))
}

export function summarizeSubscriptions(values: StripeSubscriptionInput[], hasMore: boolean) {
  const counts = { active: 0, trialing: 0, pastDue: 0, other: 0, hasMore }
  for (const { status } of values) {
    if (status === 'active') counts.active++
    else if (status === 'trialing') counts.trialing++
    else if (status === 'past_due') counts.pastDue++
    else counts.other++
  }
  return counts
}

export function summarizePayments(values: StripePaymentInput[], hasMore: boolean) {
  const totals = new Map<string, number>()
  let succeeded = 0
  let failed = 0
  for (const payment of values) {
    if (payment.status === 'succeeded') {
      succeeded++
      totals.set(payment.currency, (totals.get(payment.currency) ?? 0) + payment.amountReceived)
    } else if (payment.hasError) {
      failed++
    }
  }
  return {
    succeeded,
    failed,
    volume: currencyAmounts([...totals].map(([currency, amount]) => ({ currency, amount }))),
    hasMore,
  }
}

export function providerState(results: PromiseSettledResult<unknown>[]) {
  const fulfilled = results.filter((result) => result.status === 'fulfilled').length
  if (fulfilled === results.length) return 'ready' as const
  if (fulfilled === 0) return 'unavailable' as const
  return 'degraded' as const
}

export function resourceState(resources: ProviderResourceState[], healthyStates: Set<string>) {
  return resources.length > 0 && resources.every((resource) => healthyStates.has(resource.state))
    ? 'ready' as const
    : 'degraded' as const
}
