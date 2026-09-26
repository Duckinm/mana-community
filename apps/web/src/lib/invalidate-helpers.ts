import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export async function invalidateDocument(queryClient: QueryClient, id: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.document(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
    queryClient.invalidateQueries({ queryKey: queryKeys.documentVersions(id) }),
  ])
}

export async function invalidateDocuments(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.documents })
}

export async function invalidateProject(queryClient: QueryClient, id: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
    queryClient.invalidateQueries({ queryKey: queryKeys.trashedProjects }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projectDocuments(id) }),
  ])
}

export async function invalidateProjects(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
    queryClient.invalidateQueries({ queryKey: queryKeys.trashedProjects }),
  ])
}

export async function invalidateContact(queryClient: QueryClient, id: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts }),
    queryClient.invalidateQueries({ queryKey: ['activity', 'contact', id] }),
  ])
}

export async function invalidateContacts(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.contacts })
}

export async function invalidateItemTemplates(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.itemTemplates })
}

export async function invalidateItemTemplateGroups(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.itemTemplateGroups })
}

export async function invalidateSenderProfiles(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.senderProfiles }),
    queryClient.invalidateQueries({ queryKey: queryKeys.senderProfilesOrder }),
  ])
}

export async function invalidateRemarkTemplates(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.remarkTemplates }),
    queryClient.invalidateQueries({ queryKey: queryKeys.remarkTemplatesOrder }),
  ])
}

export async function invalidateTransactions(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
}
