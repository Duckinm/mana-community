import { motion } from 'framer-motion'
import { resolveFreelancerTypeLabel } from './draft'
import { CURRENCY_SYMBOLS, formatRateRange } from './rate-ranges'
import type { OnboardingData } from './types'
import { useTranslation } from 'react-i18next'

export function StepFinish({ data }: { data: OnboardingData }) {
  const { t } = useTranslation('onboarding')

  const symbol = CURRENCY_SYMBOLS[data.currency] ?? data.currency
  const roleLabel = resolveFreelancerTypeLabel(data)

  const summary = [
    roleLabel && { label: t('finish.role'), value: roleLabel },
    data.hourlyRate && { label: t('finish.rate'), value: `${formatRateRange(data.hourlyRate, symbol)}/hr` },
    data.revenueGoal && { label: t('finish.goal'), value: `${symbol}${Number(data.revenueGoal).toLocaleString()} ${t('identity.perMonth')}` },
    data.activeProjects && { label: t('finish.projects'), value: data.activeProjects },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="text-center space-y-6">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-sm text-muted-foreground"
      >
        {t('finish.subtitle')}
      </motion.p>

      {summary.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {summary.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-border-subtle border border-border-default"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="px-5 py-4 rounded-2xl text-left bg-primary-soft border border-primary-border"
      >
        <p className="text-xs font-semibold mb-2 text-primary">{t('finish.waiting')}</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>{t('finish.ai')}</li>
          <li>{t('finish.finance')}</li>
          <li>{t('finish.board')}</li>
        </ul>
      </motion.div>
    </div>
  )
}
