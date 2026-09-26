import { Mail } from '@/components/icons'
import { emailSchema } from '@/components/auth/auth-schemas'
import { fieldError } from '@/lib/utils'
import { requestPasswordReset } from '@/lib/auth-client'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const schema = z.object({ email: emailSchema })

export function ForgotPasswordForm({ onSent }: { onSent: (email: string) => void }) {
  const { t } = useTranslation('auth')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '' },
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      setErrorMsg(null)
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await requestPasswordReset({ email: value.email, redirectTo })
      if (error) {
        setErrorMsg(error.message ?? t('forgot.failed'))
        return
      }
      onSent(value.email)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <form.Field name="email">
        {(field) => {
          const err = field.state.meta.isTouched
            ? fieldError(field.state.meta.errors)
            : undefined
          return (
            <div className="space-y-1">
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
                />
                <input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={t('forgot.email')}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all bg-surface-raised border text-foreground ${
                    err ? 'border-danger/60' : 'border-border-default'
                  }`}
                />
              </div>
              {err && <p className="text-xs text-danger">{err}</p>}
            </div>
          )
        }}
      </form.Field>

      {errorMsg && <p className="text-xs text-danger text-center">{errorMsg}</p>}

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-base active:scale-[0.98] hover:opacity-90 disabled:opacity-60 bg-warning text-primary-foreground"
          >
            {isSubmitting ? t('forgot.submitting') : t('forgot.submit')}
          </button>
        )}
      </form.Subscribe>
    </form>
  )
}
