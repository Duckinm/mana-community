import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginSchema } from '@/components/auth/auth-schemas'
import { fieldError } from '@/lib/utils'
import { sendVerificationEmail, signIn } from '@/lib/auth-client'
import { useSessionContext } from '@/context/session'
import { useResendCooldown } from '@/hooks/use-resend-cooldown'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function LoginForm() {
  const navigate = useNavigate()
  const { refetch } = useSessionContext()
  const { t } = useTranslation('auth')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const { remaining, active, start } = useResendCooldown()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onChange: loginSchema },
    onSubmit: async ({ value }) => {
      setErrorMsg(null)
      setUnverifiedEmail(null)
      const { error } = await signIn.email({
        email: value.email,
        password: value.password,
      })
      if (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(value.email)
        } else {
          setErrorMsg(error.message ?? t('login.failed'))
        }
        return
      }
      await refetch()
      navigate({ to: '/home' })
    },
  })

  async function handleResendVerification() {
    if (!unverifiedEmail) return
    const { error } = await sendVerificationEmail({
      email: unverifiedEmail,
      callbackURL: `${window.location.origin}/home`,
    })
    if (!error) start()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-2"
    >
      <form.Field name="email">
        {(field) => {
          const err = field.state.meta.isTouched
            ? fieldError(field.state.meta.errors)
            : undefined
          return (
            <div className="space-y-1">
              <Input
                type="email"
                placeholder={t('login.email')}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className={err ? 'border-danger/60' : ''}
              />
              {err && <p className="text-xs text-danger">{err}</p>}
            </div>
          )
        }}
      </form.Field>

      <form.Field name="password">
        {(field) => {
          const err = field.state.meta.isTouched
            ? fieldError(field.state.meta.errors)
            : undefined
          return (
            <div className="space-y-1">
              <Input
                type="password"
                placeholder={t('login.password')}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className={err ? 'border-danger/60' : ''}
              />
              {err && <p className="text-xs text-danger">{err}</p>}
            </div>
          )
        }}
      </form.Field>

      {unverifiedEmail ? (
        <div className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 space-y-1.5">
          <p className="text-xs text-warning">{t('login.emailNotVerified')}</p>
          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={active}
            className="text-xs font-medium underline text-warning hover:opacity-70 transition-opacity disabled:opacity-50 disabled:no-underline"
          >
            {active
              ? t('verify.resendCooldown', { seconds: remaining })
              : t('login.resendVerification')}
          </button>
        </div>
      ) : (
        errorMsg && <p className="text-xs text-danger text-center">{errorMsg}</p>
      )}

      <div className="flex justify-end">
        <Link
          to="/forgot-password"
          className="text-xs transition-opacity hover:opacity-70 text-primary"
        >
          {t('login.forgotPassword')}
        </Link>
      </div>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            variant="solid"
            size="lg"
            className="w-full mt-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
