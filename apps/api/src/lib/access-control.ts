import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access'

// `feedback` is app-specific — merged onto BetterAuth's default admin statements
// (user/session management) so the same access-control instance covers both.
const statement = { ...defaultStatements, feedback: ['triage'] } as const

export const ac = createAccessControl(statement)

export const adminRole = ac.newRole({ ...adminAc.statements, feedback: ['triage'] })
export const userRole = ac.newRole({ ...userAc.statements })
