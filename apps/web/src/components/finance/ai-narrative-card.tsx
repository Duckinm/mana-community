import { useCapabilities } from "@/hooks/use-capabilities";
import { CapabilityNotice } from "@/components/capability-notice";
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Loader2 } from '@/components/icons'
import { ManaSparkle } from '@/components/icons/mana-sparkle'
import { AiNarrativeCardSkeleton } from '@/components/finance/ai-narrative-card-skeleton'
import { useFinanceNarrative } from './use-finance-narrative'

export function AiNarrativeCard() {
 const capabilities = useCapabilities()
 const { t } = useTranslation('accounting')
 const { data, loading, error, refetch } = useFinanceNarrative()

 if (loading && !data) {
  return <AiNarrativeCardSkeleton />
 }

 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
 className="surface-card rounded-2xl p-5 mb-6 border border-border"
 >
 <div className="flex items-center justify-between gap-3 mb-3">
 <div className="flex items-center gap-2">
 <ManaSparkle size={14} className="text-primary" />
 <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
 {t('ai.snapshot')}
 </span>
 </div>
 <button
 type="button"
 onClick={() => void refetch()}
 disabled={loading || capabilities.isError || !capabilities.data?.ai}
 className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50 bg-primary-soft text-primary"
 >
 {loading ? (
 <span className="inline-flex items-center gap-1.5">
 <Loader2 size={12} className="animate-spin" />
 {t('ai.loading')}
 </span>
 ) : (
 t('ai.refresh')
 )}
 </button>
 </div>
 <CapabilityNotice available={capabilities.data?.ai} unavailableKey="aiUnavailable" availableKey="aiCost" />
 {error && (
 <p className="text-xs text-red-400/90">{error}</p>
 )}
 {data && !error && (
 <div className="space-y-3">
 <p className="font-sans text-lg text-foreground leading-snug">{data.headline}</p>
 <p className="text-sm leading-relaxed text-muted-foreground">
 {data.narrative}
 </p>
 <ul className="text-xs space-y-1.5 pl-4 list-disc text-muted-foreground">
 {data.insights.map((line, i) => (
 <li key={i}>{line}</li>
 ))}
 </ul>
 </div>
 )}
 {!data && !loading && !error && (
 <p className="text-xs text-muted-foreground">
 {t('ai.snapshotDescription')}
 </p>
 )}
 </motion.div>
 )
}
