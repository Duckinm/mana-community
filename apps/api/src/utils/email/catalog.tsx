import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { render } from '@react-email/render'
import { env } from '@api/env'

export const EMAIL_TEMPLATE_IDS = [
  'password-reset',
  'verify-email',
  'password-changed',
  'quotation-sent',
  'invoice-sent',
  'receipt-sent',
  'payment-reminder',
  'calendar-reminder',
  'document-viewed',
  'document-accepted',
  'document-rejected',
  'delivery-failed',
  'task-deadline',
  'budget-alert',
  'weekly-summary',
  'recurring-draft-ready',
] as const

export type EmailTemplateId = typeof EMAIL_TEMPLATE_IDS[number]
export type EmailCategory = 'security' | 'documents' | 'calendar' | 'activity' | 'operations'

export interface EmailTemplateData {
  eventId?: string
  occurredAt?: string
  recipientName?: string
  recipientEmail?: string
  locale?: string
  timeZone?: string
  actorName?: string
  senderName?: string
  documentNumber?: string
  documentType?: string
  clientName?: string
  currency?: string
  amount?: string
  date?: string
  eventTitle?: string
  location?: string
  attendeeName?: string
  note?: string
  taskTitle?: string
  projectName?: string
  budgetName?: string
  percentage?: string
  spent?: string
  limit?: string
  period?: string
  revenue?: string
  tasksCompleted?: string
  activeProjects?: string
  outstandingInvoices?: string
  draftCount?: string
  reason?: string
  actionUrl?: string
}

export interface EmailTemplateDefinition {
  id: EmailTemplateId
  name: string
  category: EmailCategory
  audience: string
  trigger: string
  owner: 'MANA'
  implementation: 'live' | 'planned'
  requiredData: readonly string[]
  fixture: EmailTemplateData
  compose: (data: EmailTemplateData) => EmailContent
}

interface EmailContent {
  subject: string
  preheader: string
  heading: string
  paragraphs: string[]
  facts?: Array<[string, string | undefined]>
  actionLabel?: string
  actionUrl?: string
  warning?: string
}

const commonFixture: EmailTemplateData = {
  eventId: 'evt_example_20260714',
  occurredAt: '2026-07-14T09:00:00.000Z',
  recipientName: 'Mina',
  recipientEmail: 'mina@example.com',
  locale: 'en',
  timeZone: 'Asia/Bangkok',
  actionUrl: 'http://localhost:5173',
}

const plannedTemplates = new Set<EmailTemplateId>(['task-deadline', 'weekly-summary'])

const definitions: EmailTemplateDefinition[] = [
  define('password-reset', 'Password reset', 'security', 'Account owner', 'A password reset is requested', ['recipientName', 'actionUrl'], {
    subject: 'Reset your MANA password', preheader: 'Use this secure link to choose a new password.', heading: 'Reset your password', paragraphs: ['We received a request to reset your MANA password.', 'This link expires in one hour. If you did not request it, you can ignore this email.'], actionLabel: 'Reset password',
  }),
  define('verify-email', 'Verify email', 'security', 'Account owner', 'A new account signs up with email and password', ['recipientName', 'actionUrl'], {
    subject: 'Verify your MANA email', preheader: 'Confirm your email address to finish setting up your account.', heading: 'Verify your email', paragraphs: ['Welcome to MANA! Confirm this is your email address to activate your account.', 'This link expires in one hour. If you did not create this account, you can ignore this email.'], actionLabel: 'Verify email',
  }),
  define('password-changed', 'Password changed', 'security', 'Account owner', 'A password reset completes', ['recipientName', 'actionUrl'], {
    subject: 'Your MANA password was changed', preheader: 'Your account password has just changed.', heading: 'Password changed', paragraphs: ['Your MANA password was changed successfully.', 'If this was not you, reset your password immediately.'], actionLabel: 'Secure my account', warning: 'Unexpected change? Act now to protect your account.',
  }),
  documentDefinition('quotation-sent', 'Quotation sent', 'Quotation', 'QO-2026-014', 'Valid until'),
  documentDefinition('invoice-sent', 'Invoice sent', 'Invoice', 'INV-2026-042', 'Due'),
  documentDefinition('receipt-sent', 'Receipt sent', 'Receipt', 'RC-2026-018', 'Paid'),
  define('payment-reminder', 'Payment reminder', 'documents', 'Client', 'The freelancer sends a reminder or an opted-in due-date automation runs', ['recipientName', 'senderName', 'documentNumber', 'currency', 'amount', 'date', 'actionUrl'], {
    subject: 'Payment reminder: {{documentNumber}}', preheader: '{{documentNumber}} has an outstanding balance of {{currency}} {{amount}}.', heading: 'A friendly payment reminder', paragraphs: ['Hi {{recipientName}}, {{senderName}} is following up about invoice {{documentNumber}}.', 'The outstanding balance is {{currency}} {{amount}}, due {{date}}.'], actionLabel: 'View invoice',
  }, { senderName: 'Mina Studio', documentNumber: 'INV-2026-042', currency: 'THB', amount: '24,000.00', date: '21 July 2026' }),
  define('calendar-reminder', 'Calendar reminder', 'calendar', 'Account owner', 'An event reaches its configured reminder offset', ['recipientName', 'eventTitle', 'date'], {
    subject: 'Reminder: {{eventTitle}}', preheader: '{{eventTitle}} starts soon.', heading: '{{eventTitle}} starts soon', paragraphs: ['Here are the details for your upcoming event.'], facts: [['When', '{{date}}'], ['Location', '{{location}}'], ['Attendee', '{{attendeeName}}'], ['Note', '{{note}}']], actionLabel: 'Open calendar',
  }, { eventTitle: 'Acme kickoff', date: '16 July 2026 at 10:00 (Asia/Bangkok)', location: 'Google Meet', attendeeName: 'Narin at Acme', note: 'Bring the revised project plan.' }),
  activityDefinition('document-viewed', 'Document viewed', 'A recipient first opens a public document', 'Your {{documentType}} {{documentNumber}} was viewed', 'opened'),
  activityDefinition('document-accepted', 'Document accepted', 'A client accepts a quotation', 'Quotation {{documentNumber}} was accepted', 'accepted'),
  activityDefinition('document-rejected', 'Document rejected', 'A client rejects a quotation', 'Quotation {{documentNumber}} was rejected', 'rejected'),
  define('delivery-failed', 'Email delivery failed', 'operations', 'Account owner', 'Resend reports bounced or failed delivery', ['recipientName', 'documentNumber', 'reason', 'actionUrl'], {
    subject: 'Email delivery failed for {{documentNumber}}', preheader: 'Your client may not have received the document.', heading: 'Delivery failed', paragraphs: ['The email for {{documentNumber}} could not be delivered.', 'Reason: {{reason}}'], actionLabel: 'Review document', warning: 'Check the client email address before sending again.'
  }, { documentNumber: 'INV-2026-042', reason: 'The recipient address bounced.' }),
  define('task-deadline', 'Task deadline digest', 'operations', 'Account owner', 'A task with a normalized calendar due date is due within 24 hours', ['recipientName', 'taskTitle', 'date', 'actionUrl'], {
    subject: 'Due soon: {{taskTitle}}', preheader: '{{taskTitle}} is due {{date}}.', heading: 'A task is due soon', paragraphs: ['{{taskTitle}} in {{projectName}} is due {{date}}.'], actionLabel: 'Open task',
  }, { taskTitle: 'Finalize brand assets', projectName: 'Brand refresh', date: 'tomorrow' }),
  define('budget-alert', 'Budget threshold reached', 'operations', 'Account owner', 'A monthly category budget first crosses its configured threshold', ['recipientName', 'budgetName', 'percentage', 'spent', 'limit', 'actionUrl'], {
    subject: '{{budgetName}} reached {{percentage}} of budget', preheader: 'Spending has crossed your alert threshold.', heading: 'Budget alert', paragraphs: ['{{budgetName}} has used {{percentage}} of its budget: {{spent}} of {{limit}}.'], actionLabel: 'Review spending',
  }, { budgetName: 'Software', percentage: '80%', spent: 'THB 8,000', limit: 'THB 10,000' }),
  define('weekly-summary', 'Weekly summary', 'operations', 'Account owner', 'The opted-in weekly summary schedule runs', ['recipientName', 'period', 'actionUrl'], {
    subject: 'Your MANA week: {{period}}', preheader: 'Revenue, work and outstanding invoices at a glance.', heading: 'Your week in review', paragraphs: ['Here is what moved this week.'], facts: [['Revenue', '{{revenue}}'], ['Tasks completed', '{{tasksCompleted}}'], ['Active projects', '{{activeProjects}}'], ['Outstanding invoices', '{{outstandingInvoices}}']], actionLabel: 'Open dashboard',
  }, { period: '6–12 July', revenue: 'THB 48,000', tasksCompleted: '7', activeProjects: '3', outstandingInvoices: '2 · THB 24,000' }),
  define('recurring-draft-ready', 'Recurring drafts ready', 'operations', 'Account owner', 'The recurring-document job creates one or more drafts', ['recipientName', 'draftCount', 'actionUrl'], {
    subject: 'Recurring drafts ready: {{draftCount}}', preheader: 'Review the generated drafts before sending.', heading: 'Recurring drafts ready', paragraphs: ['MANA created drafts from your recurring schedules — {{draftCount}} in total.', 'Nothing was sent to clients automatically.'], actionLabel: 'Review drafts',
  }, { draftCount: '3' }),
]

export const emailCatalog = Object.fromEntries(definitions.map((definition) => [definition.id, definition])) as Record<EmailTemplateId, EmailTemplateDefinition>

export async function renderCatalogEmail(id: EmailTemplateId, data: EmailTemplateData): Promise<{ subject: string; html: string; text: string }> {
  const definition = emailCatalog[id]
  const content = interpolateContent(definition.compose(data), data)
  const element = <EmailLayout recipientName={data.recipientName} {...content} />
  return {
    subject: content.subject,
    html: await render(element),
    text: await render(<EmailLayout recipientName={data.recipientName} plainText {...content} />, { plainText: true }),
  }
}

function define(
  id: EmailTemplateId,
  name: string,
  category: EmailCategory,
  audience: string,
  trigger: string,
  requiredData: readonly string[],
  content: EmailContent,
  fixture: EmailTemplateData = {},
): EmailTemplateDefinition {
  return { id, name, category, audience, trigger, owner: 'MANA', implementation: plannedTemplates.has(id) ? 'planned' : 'live', requiredData, fixture: { ...commonFixture, ...fixture }, compose: () => content }
}

function documentDefinition(id: EmailTemplateId, name: string, documentType: string, documentNumber: string, dateLabel: string): EmailTemplateDefinition {
  return define(id, name, 'documents', 'Client', `The freelancer sends a ${documentType.toLowerCase()}`, ['recipientName', 'senderName', 'documentNumber', 'currency', 'amount', 'date', 'actionUrl'], {
    subject: `${documentType} {{documentNumber}} from {{senderName}}`, preheader: `${documentType} {{documentNumber}} for {{currency}} {{amount}}.`, heading: `New ${documentType.toLowerCase()} from {{senderName}}`, paragraphs: [`Hi {{recipientName}}, {{senderName}} sent you ${documentType === 'Invoice' ? 'an' : 'a'} ${documentType.toLowerCase()}.`], facts: [[documentType, '{{documentNumber}}'], ['Amount', '{{currency}} {{amount}}'], [dateLabel, '{{date}}']], actionLabel: `View ${documentType.toLowerCase()}`,
  }, { senderName: 'Mina Studio', documentType, documentNumber, currency: 'THB', amount: '24,000.00', date: documentType === 'Quotation' ? '31 July 2026' : documentType === 'Receipt' ? '12 July 2026' : '21 July 2026' })
}

function activityDefinition(id: EmailTemplateId, name: string, trigger: string, subject: string, verb: string): EmailTemplateDefinition {
  return define(id, name, 'activity', 'Account owner', trigger, ['recipientName', 'documentType', 'documentNumber', 'clientName', 'actionUrl'], {
    subject, preheader: `{{clientName}} ${verb} {{documentNumber}}.`, heading: `Document ${verb}`, paragraphs: [`{{clientName}} ${verb} your {{documentType}} {{documentNumber}}.`], actionLabel: 'Open document',
  }, { clientName: 'Acme Corp', documentType: 'invoice', documentNumber: 'INV-2026-042' })
}

function interpolateContent(content: EmailContent, data: EmailTemplateData): EmailContent {
  const replace = (value: string | undefined) => value?.replace(/\{\{(\w+)\}\}/g, (_, key: keyof EmailTemplateData) => data[key] ?? '')
  return {
    ...content,
    subject: replace(content.subject) ?? '',
    preheader: replace(content.preheader) ?? '',
    heading: replace(content.heading) ?? '',
    paragraphs: content.paragraphs.map((paragraph) => replace(paragraph) ?? ''),
    facts: content.facts?.map(([label, value]) => [label, replace(value)]),
    warning: replace(content.warning),
    actionUrl: data.actionUrl,
  }
}

function EmailLayout(props: EmailContent & { plainText?: boolean; recipientName?: string }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{props.preheader}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {props.plainText ? (
            <Text style={styles.plainTextBrand}>MANA</Text>
          ) : (
            <Img
              src={`${env.WEB_URL}/logo/mana-logo-landscape.png`}
              alt="MANA"
              width="144"
              height="48"
              style={styles.brand}
            />
          )}
          <Heading style={styles.heading}>{props.heading}</Heading>
          {props.recipientName ? <Text style={styles.text}>Hi {props.recipientName},</Text> : null}
          {props.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.text}>{paragraph}</Text>)}
          {props.facts?.length ? (
            <Section style={styles.facts}>
              {props.facts.filter(([, value]) => value).map(([label, value]) => (
                <Text key={label} style={styles.fact}><span style={styles.label}>{label}</span><br />{value}</Text>
              ))}
            </Section>
          ) : null}
          {props.warning ? <Text style={styles.warning}>{props.warning}</Text> : null}
          {props.actionLabel && props.actionUrl ? <Button href={props.actionUrl} style={styles.button}>{props.actionLabel}</Button> : null}
          <Hr style={styles.rule} />
          <Text style={styles.footer}>Sent by MANA · Manage notification preferences in Settings.</Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: { backgroundColor: '#f4f6f8', color: '#172033', fontFamily: 'Arial, sans-serif', margin: 0, padding: '32px 12px' },
  container: { backgroundColor: '#ffffff', border: '1px solid #e2e7ee', borderRadius: '12px', margin: '0 auto', maxWidth: '560px', padding: '36px' },
  brand: { height: '48px', margin: '0 0 28px', objectFit: 'contain' as const, objectPosition: 'left', width: '144px' },
  plainTextBrand: { color: '#2a2826', fontSize: '15px', fontWeight: '700', margin: '0 0 28px' },
  heading: { color: '#172033', fontSize: '28px', lineHeight: '1.2', margin: '0 0 20px' },
  text: { color: '#465268', fontSize: '16px', lineHeight: '1.65', margin: '0 0 16px' },
  facts: { backgroundColor: '#f7f9fc', borderRadius: '8px', margin: '24px 0', padding: '8px 20px' },
  fact: { color: '#172033', fontSize: '15px', lineHeight: '1.5', margin: '12px 0' },
  label: { color: '#667085', fontSize: '13px', fontWeight: '600' },
  warning: { backgroundColor: '#fff7e8', border: '1px solid #f5d48a', borderRadius: '8px', color: '#6b4d0e', fontSize: '14px', lineHeight: '1.5', padding: '12px 14px' },
  button: { backgroundColor: '#5f96f5', borderRadius: '7px', color: '#ffffff', display: 'inline-block', fontSize: '15px', fontWeight: '600', margin: '12px 0 28px', padding: '12px 20px', textDecoration: 'none' },
  rule: { borderColor: '#e2e7ee', margin: '8px 0 20px' },
  footer: { color: '#8791a5', fontSize: '12px', lineHeight: '1.5', margin: 0 },
} as const
