import { documents } from '@mana/db'
import { and, eq, gte, inArray, isNull, ne, or } from 'drizzle-orm'
import { todayCalendarDate } from '@api/lib/calendar-date'

export function publicDocumentAccessCondition(token: string) {
  return and(
    eq(documents.publicToken, token),
    isNull(documents.deletedAt),
    isNull(documents.publicAccessRevokedAt),
    inArray(documents.status, ['published', 'overdue']),
    or(
      ne(documents.type, 'QO'),
      isNull(documents.validUntilDate),
      gte(documents.validUntilDate, todayCalendarDate()),
    ),
  )
}
