import { StorageFolderPage } from '@/components/storage/storage-folder-page'
import { normalizeFolderSortKey } from '@/components/storage/storage-sort'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

const folderSearchSchema = z.object({
  q: z.string().catch(''),
  sort: z.string().catch('name-asc').transform(normalizeFolderSortKey),
  kind: z
    .enum(['all', 'pdf', 'image', 'doc', 'sheet', 'video', 'archive', 'other'])
    .catch('all'),
  tag: z.string().optional().catch(undefined),
})

const searchDefaults = {
  q: '',
  sort: 'name-asc' as const,
  kind: 'all' as const,
  tag: undefined,
}

export const Route = createFileRoute('/_app/storage/$folderId')({
  validateSearch: folderSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: StorageFolderPage,
})
