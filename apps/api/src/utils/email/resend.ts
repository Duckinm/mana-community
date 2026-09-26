import { renderCatalogEmail } from '@api/utils/email/catalog'
import { sendEmailBatch } from '@api/utils/email'

interface EmailVerificationOptions {
  to: string
  name: string
  verificationUrl: string
}

export async function sendVerificationEmail({ to, name, verificationUrl }: EmailVerificationOptions) {
  const email = await renderCatalogEmail('password-reset', {
    recipientName: name,
    actionUrl: verificationUrl,
  })
  const [result] = await sendEmailBatch([{ to, subject: email.subject, html: email.html }])
  if (result.status !== 'sent') throw new Error(result.error ?? 'Password reset email was blocked by the email sandbox')
  return result
}
