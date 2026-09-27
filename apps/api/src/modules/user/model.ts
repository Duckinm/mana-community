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
})
