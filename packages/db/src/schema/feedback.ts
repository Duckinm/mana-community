import { integer, pgTable, text, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { users } from './users'
import { instant, timestamps } from './timestamp'

export type FeedbackType = 'bug' | 'idea' | 'question' | 'other'
export type FeedbackStatus = 'new' | 'planned' | 'in_progress' | 'resolved' | 'declined'
export type FeedbackSeverity = 'critical' | 'warning' | 'info'
export type FeedbackSource = 'web' | 'ios' | 'android' | 'tablet'
export type FeedbackSplitState = 'atomic' | 'compound'

export const feedback = pgTable('feedback', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentFeedbackId: text('parent_feedback_id').references((): AnyPgColumn => feedback.id, {
    onDelete: 'cascade',
  }),
  splitState: text('split_state').$type<FeedbackSplitState>(),
  splitPartCount: integer('split_part_count'),
  type: text('type').$type<FeedbackType>().notNull().default('other'),
  message: text('message').notNull(),
  pagePath: text('page_path'),
  status: text('status').$type<FeedbackStatus>().notNull().default('new'),
  severity: text('severity').$type<FeedbackSeverity>(),
  source: text('source').$type<FeedbackSource>(),
  aiNote: text('ai_note'),
  score: integer('score'),
  encounterCount: integer('encounter_count'),
  solutionSummary: text('solution_summary'),
  timeEstimate: text('time_estimate'),
  lastPrioritizedAt: instant('last_prioritized_at'),
  ...timestamps,
})
