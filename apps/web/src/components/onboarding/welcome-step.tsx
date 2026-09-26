import { AuthDiscordIconLarge } from '@/components/auth/auth-provider-icons'
import { Button } from '@/components/ui/button'
import { useConfetti } from '@/hooks/use-confetti'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const DISCORD_INVITE_URL = 'https://discord.gg/freelanceos'

function CatLecturerIllustration() {
  return (
    <svg viewBox="0 0 100 96" className="w-28 h-24 mx-auto -mb-3 relative z-10" aria-hidden>
      <ellipse cx="50" cy="90" rx="26" ry="5" fill="black" opacity="0.2" />

      <path d="M50 90 L50 46" stroke="#7a5a3a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="42" r="4.5" fill="#e8e4d8" stroke="#7a5a3a" strokeWidth="2" />

      <g transform="translate(18,4)">
        <ellipse cx="32" cy="66" rx="24" ry="16" fill="#f2a340" />
        <path d="M10 54 Q6 34 22 26 Q38 18 50 32 Q56 44 50 58 Q44 68 32 68 Q16 68 10 54 Z" fill="#f2a340" />
        <path d="M16 26 L11 10 L26 22 Z" fill="#f2a340" />
        <path d="M46 24 L55 9 L44 22 Z" fill="#f2a340" />
        <path d="M17 23 L14 14 L23 21 Z" fill="#fbd7a1" />
        <path d="M45 21 L51 12 L43 20 Z" fill="#fbd7a1" />
        <circle cx="24" cy="38" r="2.6" fill="#2b2320" />
        <circle cx="38" cy="37" r="2.6" fill="#2b2320" />
        <ellipse cx="17" cy="44" rx="3.5" ry="2.2" fill="#f7bd7a" opacity="0.7" />
        <ellipse cx="47" cy="43" rx="3.5" ry="2.2" fill="#f7bd7a" opacity="0.7" />
        <path d="M28 44 Q31 47 34 44" stroke="#2b2320" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M14 40 L2 37 M14 43 L1 45 M44 39 L56 36 M44 42 L57 44" stroke="#2b2320" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M6 56 Q32 70 58 56 L60 64 Q32 78 4 64 Z" fill="#fff8ee" />
      </g>
    </svg>
  )
}

export function WelcomeStep({ onGetStarted }: { onGetStarted: () => void }) {
  useConfetti()
  const { t } = useTranslation('onboarding')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-6 bg-surface-page">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse at center, var(--success) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[400px] opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <CatLecturerIllustration />
        </motion.div>

        <div className="rounded-2xl border-[6px] border-[#6b4a30] bg-[#243c30] px-6 py-8 text-center shadow-2xl">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2"
          >
            <h2 className="text-xl font-semibold text-[#f5f1e6]">{t('welcome.title')}</h2>
            <p className="text-sm text-[#cfd9d0]">{t('welcome.subtitle')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 space-y-2 text-left"
          >
            <p className="text-xs font-semibold text-[#cfd9d0]">{t('welcome.community')}</p>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1c2e25] border border-[#3f5847] hover:bg-[#213329] transition-colors text-[#f5f1e6]"
            >
              <AuthDiscordIconLarge />
              <span className="text-sm">{t('welcome.discord')}</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6"
          >
            <Button type="button" variant="solid" size="lg" className="w-full" onClick={onGetStarted}>
              {t('welcome.getStarted')}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
