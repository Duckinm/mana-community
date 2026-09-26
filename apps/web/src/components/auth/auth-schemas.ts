import { z } from 'zod'
import i18next from '@/lib/i18n'

export const PASSWORD_MIN_LENGTH = 8

const tAuth = (key: string) => i18next.t(key, { ns: 'auth' })

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: tAuth('validation.emailRequired') })
  .email({ message: tAuth('validation.emailInvalid') })

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: tAuth('validation.passwordMin') })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: tAuth('validation.passwordRequired') }),
})

const passwordPairFields = {
  password: passwordSchema,
  confirmPassword: z.string(),
}

const passwordsMatch = (v: { password: string; confirmPassword: string }) =>
  v.password === v.confirmPassword

const mismatchIssue = {
  message: tAuth('validation.passwordMismatch'),
  path: ['confirmPassword'],
}

export const registerSchema = z
  .object({
    email: emailSchema,
    ...passwordPairFields,
  })
  .refine(passwordsMatch, mismatchIssue)

export const resetPasswordSchema = z
  .object(passwordPairFields)
  .refine(passwordsMatch, mismatchIssue)

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export interface PasswordRule {
  key: string
  labelKey: string
  test: (values: { password: string; confirmPassword: string }) => boolean
}

export const passwordRules: PasswordRule[] = [
  {
    key: 'length',
    labelKey: 'validation.rules.length',
    test: (v) => v.password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: 'match',
    labelKey: 'validation.rules.match',
    test: (v) => v.confirmPassword.length > 0 && v.password === v.confirmPassword,
  },
]
