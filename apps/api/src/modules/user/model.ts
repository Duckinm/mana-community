import { t } from 'elysia'
import { UserResponse } from '@api/lib/db-schema'
import { IsoInstant, NotFoundResponse } from '@api/lib/wire-schema'

export { UserResponse, UpdateUserBody } from '@api/lib/db-schema'
export { NotFoundResponse }

export const AvatarUploadResponse = t.Object({
  avatarUrl: t.String(),
  user: UserResponse,
})

export const McpTokenRegenerateResponse = t.Object({
  mcpToken: t.String(),
  mcpTokenRotatedAt: IsoInstant,
})

export const GetStartedResponse = t.Object({
  hasContact: t.Boolean(),
  hasProject: t.Boolean(),
  hasDocument: t.Boolean(),
  hasTransaction: t.Boolean(),
  hasProfile: t.Boolean(),
  profileAiActionCredits: t.Number(),
})

export const CompleteProfileRewardBody = t.Object({
  freelancerType: t.String({ minLength: 1, maxLength: 120 }),
  hourlyRate: t.Optional(t.Union([t.String({ maxLength: 80 }), t.Null()])),
  currency: t.Optional(t.Union([t.String({ maxLength: 12 }), t.Null()])),
  revenueGoal: t.Optional(t.Union([t.String({ maxLength: 80 }), t.Null()])),
  activeProjects: t.Optional(t.Union([t.String({ maxLength: 12 }), t.Null()])),
  painPoint: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  heardFrom: t.Optional(t.Union([t.String({ maxLength: 80 }), t.Null()])),
})

export const CompleteProfileRewardResponse = t.Object({
  granted: t.Boolean(),
  profileAiActionCredits: t.Number(),
})
