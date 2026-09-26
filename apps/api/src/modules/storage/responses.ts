import { t } from 'elysia'
import { IsoInstant, NullableIsoInstant, NullableString, NotFoundResponse } from '@api/lib/wire-schema'
import { FileKindSchema, NullableStorageEntityTypeSchema } from '@api/lib/wire-enums'

export const StorageFolderResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  parentId: NullableString,
  entityType: NullableStorageEntityTypeSchema,
  entityId: NullableString,
  color: NullableString,
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})

export const StorageFileResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  kind: FileKindSchema,
  sizeBytes: t.Number(),
  mimeType: t.String(),
  folderId: NullableString,
  r2Key: t.String(),
  tags: t.Array(t.String()),
  uploadedAt: IsoInstant,
  updatedAt: IsoInstant,
  deletedAt: NullableIsoInstant,
})

export const StorageSearchFileResponse = t.Composite([
  StorageFileResponse,
  t.Object({ folderName: NullableString }),
])

export const StorageFoldersListResponse = t.Array(StorageFolderResponse)
export const StorageFilesListResponse = t.Array(StorageFileResponse)
export const StorageSearchFilesListResponse = t.Array(StorageSearchFileResponse)

export const StorageQuotaResponse = t.Object({
  usedBytes: t.Number(),
  fileCount: t.Number(),
  limitBytes: t.Union([t.Number(), t.Null()]),
})

export const StorageSignedUrlResponse = t.Object({
  url: t.Union([t.String(), t.Null()]),
})

export const StorageTrashPurgeResponse = t.Object({
  deleted: t.Number(),
})

export { NotFoundResponse }
