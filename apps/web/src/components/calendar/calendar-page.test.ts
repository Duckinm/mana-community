import { describe, expect, it } from 'vitest'
import { taskSchedulePatch } from '@/components/calendar/calendar-page'

describe('taskSchedulePatch', () => {
  it('moves the due date and time to the scheduled block start', () => {
    expect(
      taskSchedulePatch(
        new Date(2026, 7, 4, 7),
        new Date(2026, 7, 6, 10),
      ),
    ).toMatchObject({
      due: '2026-08-04',
      dueTime: '07:00',
      scheduledStart: new Date(2026, 7, 4, 7).toISOString(),
      scheduledEnd: new Date(2026, 7, 6, 10).toISOString(),
    })
  })
})
