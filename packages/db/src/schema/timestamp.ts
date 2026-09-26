import { timestamp } from 'drizzle-orm/pg-core'

/** Postgres `timestamptz` ↔ JS `Date` — use for all instants (not calendar dates). */
export const instantOpts = { withTimezone: true, mode: 'date' } as const

export function instant(name: string) {
  return timestamp(name, instantOpts)
}

/** `created_at` + `updated_at` — use with `...timestamps` inside `pgTable`. */
export const timestamps = {
  createdAt: instant('created_at').notNull().defaultNow(),
  updatedAt: instant('updated_at').notNull().defaultNow(),
}

/** Nullable `deleted_at` for soft-delete (e.g. projects). */
export const deletedAt = instant('deleted_at')
