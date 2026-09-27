import { pgTable, text, boolean, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { instant, timestamps } from './timestamp'

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

export const NOTIFICATION_CHANNELS = ['inApp', 'email', 'push', 'line'] as const

export type NotificationEvent = typeof NOTIFICATION_EVENTS[number]
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number]
export type NotificationPreferenceKey = `${NotificationEvent}.${NotificationChannel}`
export type NotificationPreferences = Partial<Record<NotificationPreferenceKey, boolean>>

export const NOTIFICATION_PREFERENCE_KEYS = NOTIFICATION_EVENTS.flatMap((event) =>
  NOTIFICATION_CHANNELS.map((channel) => `${event}.${channel}` as const),
)

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = Object.fromEntries(
  NOTIFICATION_PREFERENCE_KEYS.map((key) => [key, false]),
)

for (const event of ['quotationViewed', 'quotationAccepted', 'quotationRejected', 'invoiceViewed', 'receiptViewed'] as const) {
  DEFAULT_NOTIFICATION_PREFERENCES[`${event}.inApp`] = true
  DEFAULT_NOTIFICATION_PREFERENCES[`${event}.email`] = true
  DEFAULT_NOTIFICATION_PREFERENCES[`${event}.push`] = true
  DEFAULT_NOTIFICATION_PREFERENCES[`${event}.line`] = true
}

for (const event of ['quotationDeliveryFailed', 'invoiceDeliveryFailed', 'receiptDeliveryFailed'] as const) {
  DEFAULT_NOTIFICATION_PREFERENCES[`${event}.email`] = true
}

DEFAULT_NOTIFICATION_PREFERENCES['recurringDraftReady.email'] = true
DEFAULT_NOTIFICATION_PREFERENCES['recurringDraftReady.line'] = true
DEFAULT_NOTIFICATION_PREFERENCES['invoiceReminderSent.inApp'] = true
DEFAULT_NOTIFICATION_PREFERENCES['invoiceReminderSent.push'] = true
DEFAULT_NOTIFICATION_PREFERENCES['taskDeadline.email'] = true
DEFAULT_NOTIFICATION_PREFERENCES['calendarReminder.email'] = true

for (const event of ['calendarReminder', 'budgetApproaching', 'budgetExceeded', 'invoicePaymentReceived', 'receiptReview', 'reconciliationAttention', 'paymentSlipAttention'] as const) {
  DEFAULT_NOTIFICATION_PREFERENCES[`${event}.inApp`] = true
  DEFAULT_NOTIFICATION_PREFERENCES[`${event}.push`] = true
}

DEFAULT_NOTIFICATION_PREFERENCES['budgetApproaching.email'] = true
DEFAULT_NOTIFICATION_PREFERENCES['budgetExceeded.email'] = true
DEFAULT_NOTIFICATION_PREFERENCES['aiNeedsInput.inApp'] = true
DEFAULT_NOTIFICATION_PREFERENCES['aiNeedsInput.push'] = true

// Users table — core identity record for each registered user
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  role: text('role').notNull().default('user'),
  banned: boolean('banned').notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: instant('ban_expires'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  image: text('image'),
  ...timestamps,

  // Onboarding / identity prefs
  onboardedAt: instant('onboarded_at'),
  freelancerType: text('freelancer_type'),
  avatarColor: text('avatar_color').default('#D4A843'),
  hourlyRate: text('hourly_rate'),
  currency: text('currency').default('USD'),
  timezone: text('timezone'),
  region: text('region').$type<'TH' | 'US'>(),
  dateFormat: text('date_format').$type<'regional' | 'dmy' | 'mdy'>().notNull().default('regional'),
  timeFormat: text('time_format').$type<'regional' | 'h12' | 'h24'>().notNull().default('regional'),
  revenueGoal: text('revenue_goal'),
  activeProjects: text('active_projects'),
  painPoint: text('pain_point'),
  heardFrom: text('heard_from'),
  profileAiActionCredits: integer('profile_ai_action_credits').notNull().default(0),
  profileAiRewardClaimedAt: instant('profile_ai_reward_claimed_at'),

  // Appearance
  theme: text('theme').default('dark'),
  accentColor: text('accent_color').default('#D4A843'),
  density: text('density').default('default'),
  animationsOn: boolean('animations_on').default(true),
  reducedMotion: boolean('reduced_motion').default(false),
  hideBranding: boolean('hide_branding').notNull().default(false),

  notifDesktopPush: boolean('notif_desktop_push').default(false),
  notificationPreferences: jsonb('notification_preferences').$type<NotificationPreferences>().notNull().default(DEFAULT_NOTIFICATION_PREFERENCES),

  // AI settings
  aiMemory: boolean('ai_memory').default(true),
  aiProactive: boolean('ai_proactive').default(true),
  aiVoiceEnabled: boolean('ai_voice_enabled').default(false),
  aiTone: text('ai_tone').default('balanced'),
  // Tool names hidden from the chat agent; applied in local-LLM mode only (C-353)
  disabledAiTools: jsonb('disabled_ai_tools').$type<string[]>().notNull().default([]),
  disabledExternalMcpTools: jsonb('disabled_external_mcp_tools').$type<string[]>().notNull().default([]),

  // Privacy
  analyticsEnabled: boolean('analytics_enabled').default(true),
  crashReportsEnabled: boolean('crash_reports_enabled').default(true),

  // MCP / AI chat
  mcpToken: text('mcp_token').$defaultFn(() => crypto.randomUUID()),
  mcpTokenRotatedAt: instant('mcp_token_rotated_at'),

  // Retained for existing databases; community runtime does not use subscription fields.
  plan: text('plan').notNull().default('free'), // free | mana | aether
  billingInterval: text('billing_interval'), // monthly | annual
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: text('subscription_status'), // mirrors Stripe subscription.status
  currentPeriodEnd: instant('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  // Legacy Cloud event timestamp, preserved without reconciliation in community.
  stripeEventAt: instant('stripe_event_at'),
}, (t) => [
  uniqueIndex('users_mcp_token_idx').on(t.mcpToken),
  uniqueIndex('users_stripe_customer_id_idx').on(t.stripeCustomerId),
])
