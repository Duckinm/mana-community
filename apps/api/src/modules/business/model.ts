import { NotFoundResponse, SuccessResponse } from '@api/lib/wire-schema'
import { SenderProfileResponse, RemarkTemplateResponse } from '@api/lib/db-schema'

export {
  SenderProfileResponse,
  SenderProfilesListResponse,
  RemarkTemplateResponse,
  RemarkTemplatesListResponse,
} from '@api/lib/db-schema'

export const BusinessMutationResponses = {
  200: SenderProfileResponse,
  201: SenderProfileResponse,
  404: NotFoundResponse,
} as const

export const RemarkMutationResponses = {
  200: RemarkTemplateResponse,
  201: RemarkTemplateResponse,
  404: NotFoundResponse,
} as const

export const BusinessDeleteResponse = SuccessResponse
