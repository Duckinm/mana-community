import { ArrowLeft, Mail } from '@/components/icons'
import { ManaLogo } from '@/components/brand/mana-logo'
import { Button } from '@/components/ui/button'
import { useResendCooldown } from '@/hooks/use-resend-cooldown'
import { sendVerificationEmail } from '@/lib/auth-client'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function VerifyEmailNotice({ email }: { email: string }) {
  const { t } = useTranslation('auth')
  const { remaining, active, start } = useResendCooldown()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  async function handleResend() {
    setErrorMsg(null)
    const { error } = await sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/chat`,
    })
    if (error) {
      setErrorMsg(error.message ?? t('verify.resendFailed'))
      return
    }
    setResent(true)
    start()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-surface-page">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
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
            {t('verify.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('verify.subtitle')}</p>
        </div>

        <div className="surface-card rounded-3xl p-6 text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-warning-soft border border-warning-border">
            <Mail size={22} className="text-warning" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium mb-1 text-foreground">{t('verify.sentTo')}</p>
            <p className="text-sm font-semibold text-primary">{email}</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {resent ? t('verify.resent') : t('verify.notReceived')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={active}
            onClick={handleResend}
          >
            {active ? t('verify.resendCooldown', { seconds: remaining }) : t('verify.resend')}
          </Button>
          {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}
        </div>

        <div className="flex justify-center mt-5">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity text-muted-foreground"
          >
            <ArrowLeft size={12} />
            {t('verify.backToSignIn')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
