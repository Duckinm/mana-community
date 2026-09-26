import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle2 } from '@/components/icons'
import { ManaLogo } from '@/components/brand/mana-logo'
import { useState } from 'react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/forgot-password')({ component: ForgotPasswordPage })

function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [sentEmail, setSentEmail] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse at center, var(--warning) 0%, transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <ManaLogo className="mx-auto mb-6 h-11 w-auto" />
          <h1 className="text-3xl font-light tracking-[-0.02em] mb-2 text-foreground">
            {t('forgot.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sentEmail ? t('forgot.subtitleSent') : t('forgot.subtitle')}
          </p>
        </div>

        <div className="surface-card rounded-3xl p-6">
          <AnimatePresence mode="wait">
            {!sentEmail ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ForgotPasswordForm onSent={setSentEmail} />
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-center py-4 space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-success-soft border border-success-border">
                  <CheckCircle2 size={22} className="text-success" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1 text-foreground">{t('forgot.sentTo')}</p>
                  <p className="text-sm font-semibold text-primary">{sentEmail}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('forgot.notReceived')}{' '}
                  <button
                    onClick={() => setSentEmail(null)}
                    className="underline hover:opacity-70 transition-opacity text-foreground"
                  >
                    {t('forgot.tryAgain')}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center mt-5">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity text-muted-foreground"
          >
            <ArrowLeft size={12} />
            {t('forgot.backToSignIn')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
