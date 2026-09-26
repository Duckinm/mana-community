import type { ApiAiUsage, ApiInvoiceSummary, ApiUser, ApiUserPatch } from '@/lib/api-types'

export type UserPrefs = ApiUser
export type UserPatch = ApiUserPatch
export type AiUsage = ApiAiUsage
export type AiUsageBucket = ApiAiUsage['ai']
export type InvoiceSummary = ApiInvoiceSummary
