import { afterEach, describe, expect, it } from 'vitest'
import { syncDateTimePreferences } from '@/lib/date-time-preferences'
import { formatScheduledTaskTime } from '@/components/projects/task-detail-page'

describe('formatScheduledTaskTime', () => {
  afterEach(() => {
    syncDateTimePreferences({ region: 'US', dateFormat: 'regional', timeFormat: 'regional' })
  })

  it('shows both ends after a scheduled block is resized', () => {
    syncDateTimePreferences({
      region: 'TH',
      dateFormat: 'regional',
      timeFormat: 'regional',
      timezone: 'Asia/Bangkok',
    })

    expect(
      formatScheduledTaskTime(
        '2026-08-09T02:30:00.000Z',
        '2026-08-09T04:00:00.000Z',
        '09:30',
      ),
    ).toBe('09:30 – 11:00')
  })
})
