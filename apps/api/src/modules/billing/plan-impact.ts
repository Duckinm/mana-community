import {
  CALENDAR_SYNC_ALLOWED,
  type PlanId,
} from '@mana/db/plan-entitlements'
import { getCalendarConnection } from '@api/modules/calendar/connection'
import { countPlanArchivedProjects } from '@api/modules/billing/entitlements'
import { getCurrentMonthUsage } from '@api/modules/billing/usage'

export type PlanChangeImpact = {
  plan: PlanId
  projects: {
    used: number
    cap: number | null
    toArchive: number
    planArchived: number
    /** How many of `planArchived` fit back under this plan's cap right now. */
    restorable: number
  }
  ai: { used: number; cap: number }
  docsSent: { used: number; cap: number | null }
  storage: { usedBytes: number; capBytes: number | null; overBytes: number }
  calendarSync: { connected: boolean; allowed: boolean }
}

export async function getPlanChangeImpact(
  userId: string,
  plan: PlanId,
): Promise<PlanChangeImpact> {
  const [planArchived, usage, calendar] = await Promise.all([
    countPlanArchivedProjects(userId),
    getCurrentMonthUsage(userId, plan),
    getCalendarConnection(userId),
  ])

  const projectCap = usage.projects.cap
  return {
    plan,
    projects: {
      used: usage.projects.used,
      cap: projectCap,
      toArchive: projectCap === null ? 0 : Math.max(0, usage.projects.used - projectCap),
      planArchived,
      restorable:
        projectCap === null
          ? planArchived
          : Math.min(planArchived, Math.max(0, projectCap - usage.projects.used)),
    },
    ai: { used: usage.ai.used, cap: usage.ai.cap },
    docsSent: usage.docsSent,
    storage: {
      ...usage.storage,
      overBytes: usage.storage.capBytes === null ? 0 : Math.max(0, usage.storage.usedBytes - usage.storage.capBytes),
    },
    calendarSync: {
      connected: calendar.connected,
      allowed: CALENDAR_SYNC_ALLOWED[plan],
    },
  }
}
