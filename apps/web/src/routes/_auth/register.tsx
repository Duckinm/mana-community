import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { SignupStep } from '@/components/auth/signup-step'
import { VerifyEmailNotice } from '@/components/auth/verify-email-notice'
import { ManaLogo } from '@/components/brand/mana-logo'
import { AuthRadialBackdrop } from '@/components/auth/auth-screen-primitives'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/_auth/register')({ component: RegisterPage })

function RegisterPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)

  function handleSuccess() {
    sessionStorage.setItem('fast-lane-open-contact', '1')
    navigate({ to: '/contacts', search: { q: '', sort: 'projects' } })
  }

  if (pendingVerificationEmail) {
    return <VerifyEmailNotice email={pendingVerificationEmail} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <AuthRadialBackdrop variant="register" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <h1 className="flex justify-center">
            <ManaLogo className="h-16 w-auto sm:h-20" />
          </h1>
          <p className="mt-5 text-lg font-semibold text-foreground">{t('register.fastLaneTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('register.fastLaneSubtitle')}</p>
        </div>

        <div className="surface-card rounded-3xl p-6 space-y-4">
          <SignupStep
            onSuccess={handleSuccess}
            onNeedsVerification={setPendingVerificationEmail}
          />
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {t('register.fastLaneNext')}
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="font-medium hover:opacity-70 transition-opacity text-primary">
            {t('register.signIn')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
