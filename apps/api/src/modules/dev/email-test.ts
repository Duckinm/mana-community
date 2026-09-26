import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { emailCatalog, EMAIL_TEMPLATE_IDS, renderCatalogEmail, type EmailTemplateId } from '@api/utils/email/catalog'
import { sendEmailBatch } from '@api/utils/email'
import { env } from '@api/env'

function isTemplateId(value: string): value is EmailTemplateId {
  return EMAIL_TEMPLATE_IDS.includes(value as EmailTemplateId)
}

export const devEmailTestModule = new Elysia({ name: 'dev-email-test', prefix: '/api/dev' })
  .use(betterAuthPlugin)
  .onBeforeHandle(({ status }) => {
    if (env.NODE_ENV === 'production') return status(404, { error: 'Not found' })
  })
  .get('/email-gallery', async () => ({
    sharedData: ['eventId', 'occurredAt', 'recipientName', 'recipientEmail', 'locale', 'timeZone', 'actionUrl'],
    deliveryMetadata: ['userId', 'referenceId', 'templateId', 'idempotencyKey'],
    templates: await Promise.all(EMAIL_TEMPLATE_IDS.map(async (id) => {
      const definition = emailCatalog[id]
      const preview = await renderCatalogEmail(id, definition.fixture)
      return {
        id,
        name: definition.name,
        category: definition.category,
        audience: definition.audience,
        trigger: definition.trigger,
        owner: definition.owner,
        implementation: definition.implementation,
        requiredData: definition.requiredData,
        fixtureData: definition.fixture,
        ...preview,
      }
    })),
  }), {
    auth: true,
    detail: { tags: ['Dev'], summary: 'Preview every production email template' },
  })
  .post('/email-gallery/send', async ({ user, body, status }) => {
    if (!isTemplateId(body.templateId)) return status(400, { error: 'Unknown email template' })
    const definition = emailCatalog[body.templateId]
    const email = await renderCatalogEmail(body.templateId, definition.fixture)
    const [result] = await sendEmailBatch([{ to: body.to ?? user.email, subject: email.subject, html: email.html }])
    return status(result.status === 'sent' ? 200 : 400, {
      status: result.status,
      to: result.to,
      subject: email.subject,
      resendId: result.resendId,
      error: result.error,
    })
  }, {
    auth: true,
    body: t.Object({ templateId: t.String(), to: t.Optional(t.String({ format: 'email' })) }),
    detail: { tags: ['Dev'], summary: 'Send a production-rendered email fixture' },
  })
