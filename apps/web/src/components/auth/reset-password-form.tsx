import { resetPasswordSchema } from '@/components/auth/auth-schemas'
import { PasswordChecklist } from '@/components/auth/password-checklist'
import { fieldError } from '@/lib/utils'
import { resetPassword } from '@/lib/auth-client'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function ResetPasswordForm({
  token,
  onSuccess,
}: {
  token: string
  onSuccess: () => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validators: { onChange: resetPasswordSchema },
    onSubmit: async ({ value }) => {
      setErrorMsg(null)
      if (!token) {
        setErrorMsg(t('reset.invalidToken'))
        return
      }
      const { error } = await resetPassword({ newPassword: value.password, token })
      if (error) {
        setErrorMsg(error.message ?? t('reset.failed'))
        return
      }
      setSuccess(true)
      onSuccess()
      setTimeout(() => navigate({ to: '/login' }), 2000)
    },
  })

  const inputClass = (err: string | undefined) =>
    `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-50 bg-surface-raised border text-foreground ${
      err ? 'border-danger/60' : 'border-border-default'
    }`

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <div className="space-y-2">
        <form.Field name="password">
          {(field) => {
            const err = field.state.meta.isTouched
              ? fieldError(field.state.meta.errors)
              : undefined
            return (
              <input
                type="password"
                placeholder={t('reset.password')}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                disabled={success}
                className={inputClass(err)}
              />
            )
          }}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => {
            const err = field.state.meta.isTouched
              ? fieldError(field.state.meta.errors)
              : undefined
            return (
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder={t('reset.confirmPassword')}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={success}
                  className={inputClass(err)}
                />
                {err && <p className="text-xs text-danger">{err}</p>}
              </div>
            )
          }}
        </form.Field>
      </div>

      <form.Subscribe selector={(s) => [s.values.password, s.values.confirmPassword] as const}>
        {([password, confirmPassword]) => (
          <PasswordChecklist password={password} confirmPassword={confirmPassword} />
        )}
      </form.Subscribe>

      {errorMsg && <p className="text-xs text-danger text-center">{errorMsg}</p>}

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <button
            type="submit"
            disabled={isSubmitting || success}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-base active:scale-[0.98] hover:opacity-90 disabled:opacity-60 bg-primary text-primary-foreground"
          >
            {isSubmitting ? t('reset.submitting') : success ? t('reset.done') : t('reset.submit')}
          </button>
        )}
      </form.Subscribe>
    </form>
  )
}
