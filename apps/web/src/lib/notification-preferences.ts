export const NOTIFICATION_CHANNELS = ['inApp', 'email', 'push', 'line'] as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_EVENTS = [
  'quotationViewed',
  'quotationAccepted',
  'quotationRejected',
  'quotationExpiring',
  'quotationDeliveryFailed',
  'invoiceViewed',
  'invoiceDueSoon',
  'invoiceOverdue',
  'invoiceReminderSent',
  'invoicePaymentReceived',
  'invoiceDeliveryFailed',
  'receiptGenerated',
  'receiptViewed',
  'receiptDeliveryFailed',
  'recurringDraftReady',
  'taskDeadline',
  'calendarReminder',
  'budgetApproaching',
  'budgetExceeded',
  'weeklySummary',
  'aiResponseCompleted',
  'aiNeedsInput',
  'contactAdded',
  'receiptReview',
  'reconciliationAttention',
  'paymentSlipAttention',
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]
export type NotificationPreferenceKey = `${NotificationEvent}.${NotificationChannel}`
export type NotificationPreferences = Partial<Record<NotificationPreferenceKey, boolean>>

export const LINE_NOTIFICATION_EVENTS = [
  'quotationViewed',
  'quotationAccepted',
  'quotationRejected',
  'invoiceViewed',
  'receiptViewed',
  'recurringDraftReady',
] as const satisfies readonly NotificationEvent[]

export const NOTIFICATION_EVENT_GROUPS = [
  {
    key: 'quotation',
    events: [
      'quotationViewed',
      'quotationAccepted',
      'quotationRejected',
      'quotationExpiring',
      'quotationDeliveryFailed',
    ],
  },
  {
    key: 'invoice',
    events: [
      'invoiceViewed',
      'invoiceDueSoon',
      'invoiceOverdue',
      'invoiceReminderSent',
      'invoicePaymentReceived',
      'invoiceDeliveryFailed',
    ],
  },
  {
    key: 'receipt',
    events: ['receiptGenerated', 'receiptViewed', 'receiptDeliveryFailed'],
  },
  { key: 'automation', events: ['recurringDraftReady'] },
  {
    key: 'work',
    events: ['taskDeadline', 'calendarReminder', 'budgetApproaching', 'budgetExceeded'],
  },
  {
    key: 'assistant',
    events: ['weeklySummary', 'aiResponseCompleted', 'aiNeedsInput', 'contactAdded'],
  },
  {
    key: 'attention',
    events: ['receiptReview', 'reconciliationAttention', 'paymentSlipAttention'],
  },
] as const satisfies readonly {
  key: string
  events: readonly NotificationEvent[]
}[]

export function notificationPreferenceKey(
  event: NotificationEvent,
  channel: NotificationChannel,
): NotificationPreferenceKey {
  return `${event}.${channel}`
}
