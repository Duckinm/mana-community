import { ContactsLayout } from '@/components/contacts/contacts-layout'
import { ContactsProvider } from '@/context/contacts'
import { StorageProvider } from '@/context/storage'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

const contactSearchSchema = z.object({
  q: z.string().catch(''),
  sort: z.enum(['alpha', 'projects']).catch('projects'),
})

const searchDefaults = { q: '', sort: 'projects' as const }

export const Route = createFileRoute('/_app/contacts')({
  validateSearch: contactSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: () => (
    <StorageProvider>
      <ContactsProvider>
        <ContactsLayout />
      </ContactsProvider>
    </StorageProvider>
  ),
})
