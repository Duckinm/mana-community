import { ACTION_CAPS, PROJECT_CAPS, type PaidPlanId } from '@mana/db/plan-entitlements'

export function planCardClass(plan: PaidPlanId, selected: boolean): string {
  const base = 'w-full rounded-xl p-4 text-left border transition-colors'
  if (selected) {
    return plan === 'mana'
      ? `${base} border-primary-border bg-primary-soft`
      : `${base} border-primary bg-accent`
  }
  return `${base} surface-card border-border-subtle hover:border-primary/40`
}

export function paidPlanFeatures(
  plan: PaidPlanId,
  t: (key: string, options?: Record<string, unknown>) => string,
): string[] {
  const projects = PROJECT_CAPS[plan]
  return [
    projects === null
      ? t('billing.privilege.feature.projectsUnlimited')
      : t('billing.privilege.feature.projects', { count: projects }),
    t('billing.privilege.feature.ai', { count: ACTION_CAPS[plan] }),
    t('billing.privilege.feature.coreTools'),
  ]
}

export function formatPlanChangeAmount(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}
