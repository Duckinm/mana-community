import type { ApiContact, ApiContactCreateBody } from '@/lib/api-types'

export type Contact = ApiContact
export type ContactCreateInput = ApiContactCreateBody
export type ContactLinkedProject = ApiContact['linkedProjects'][number]
