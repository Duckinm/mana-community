import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from '@/components/icons'
import { ManaLogo } from '@/components/brand/mana-logo'
import { useState } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const { t } = useTranslation('auth')
  const [success, setSuccess] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)' }}
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
            {t('reset.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {success ? t('reset.subtitleSuccess') : t('reset.subtitle')}
          </p>
        </div>

        <div className="surface-card rounded-3xl p-6">
          <ResetPasswordForm token={token} onSuccess={() => setSuccess(true)} />
        </div>

        <div className="flex justify-center mt-5">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity text-muted-foreground"
          >
            <ArrowLeft size={12} />
            {t('reset.backToSignIn')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
