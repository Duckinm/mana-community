import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { env } from '@api/env'
import {
  listFolders, createFolder, deleteFolder,
  listFiles, softDeleteFile, restoreFile, listTrashedFiles, purgeExpiredStorageTrash,
  uploadFile, getFileSignedUrl,
  renameFile, renameFolder, searchFiles, buildFolderZip,
  bulkMoveFiles, getStorageQuota, updateFileTags,
} from '@api/modules/storage/service'
import { CreateFolderBody, UploadFileBody, FilesQuery, RenameBody, BulkMoveBody, TagsBody } from '@api/modules/storage/model'
import {
  StorageFoldersListResponse,
  StorageFolderResponse,
  StorageFilesListResponse,
  StorageFileResponse,
  StorageSearchFilesListResponse,
  StorageSignedUrlResponse,
  StorageQuotaResponse,
  StorageTrashPurgeResponse,
  NotFoundResponse,
} from '@api/modules/storage/responses'
import { NoContentResponse, ErrorResponse, MessageResponse } from '@api/lib/wire-schema'
import { requireCronSecret } from '@api/lib/cron-secret'

export const storageModule = new Elysia({ name: 'storage', prefix: '/api' })
  .use(betterAuthPlugin)

  .get('/storage/folders', async ({ user }) => {
    return listFolders(user.id)
  }, {
    auth: true,
    response: { 200: StorageFoldersListResponse },
    detail: { tags: ['Storage'], summary: 'List folders' },
  })

  .post('/storage/folders', async ({ user, status, body }) => {
    const row = await createFolder(user.id, body)
    return status(201, row)
  }, {
    auth: true,
    body: CreateFolderBody,
    response: { 201: StorageFolderResponse },
    detail: { tags: ['Storage'], summary: 'Create folder' },
  })

  .delete('/storage/folders/:id', async ({ user, status, params }) => {
    const found = await deleteFolder(user.id, params.id)
    if (!found) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, {
    auth: true,
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['Storage'], summary: 'Delete folder and its files' },
  })

  .get('/storage/trash', async ({ user }) => {
    return listTrashedFiles(user.id)
  }, {
    auth: true,
    response: { 200: StorageFilesListResponse },
    detail: { tags: ['Storage'], summary: 'List trashed files' },
  })

  .post('/storage/files/:id/restore', async ({ user, status, params }) => {
    const restored = await restoreFile(user.id, params.id)
    if (!restored) return status(404, { message: 'Not found' })
    return restored
  }, {
    auth: true,
    response: { 200: StorageFileResponse, 404: NotFoundResponse },
    detail: { tags: ['Storage'], summary: 'Restore trashed file' },
  })

  .get('/storage/files', async ({ user, query }) => {
    if (query.q) return searchFiles(user.id, query.q)
    return listFiles(user.id, query.folderId)
  }, {
    auth: true,
    query: FilesQuery,
    response: { 200: t.Union([StorageFilesListResponse, StorageSearchFilesListResponse]) },
    detail: { tags: ['Storage'], summary: 'List files or search by name' },
  })

  .delete('/storage/files/:id', async ({ user, status, params }) => {
    const trashed = await softDeleteFile(user.id, params.id)
    if (!trashed) return status(404, { message: 'Not found' })
    return trashed
  }, {
    auth: true,
    response: { 200: StorageFileResponse, 404: NotFoundResponse },
    detail: { tags: ['Storage'], summary: 'Move file to trash' },
  })

  .post('/storage/cron/cleanup-trash', async ({ request, status }) => {
    const unauthorized = requireCronSecret(request, status, env.CRON_SECRET)
    if (unauthorized) return unauthorized
    const deleted = await purgeExpiredStorageTrash()
    return { deleted }
  }, {
    response: { 200: StorageTrashPurgeResponse, 401: MessageResponse },
    detail: { tags: ['Storage'], summary: 'Cron: purge expired trashed files', hide: true },
  })

  .post('/storage/upload', async ({ user, status, body }) => {
    if (!env.R2_ACCESS_KEY_ID) return status(503, { error: 'R2 not configured' })
    try {
      const file = await uploadFile(user.id, body.file, {
        kind: body.kind,
        folderId: body.folderId,
        entityType: body.entityType,
        entityId: body.entityId,
      })
      return status(201, file)
    } catch (err) {
      if (err instanceof Error && err.message === 'QUOTA_EXCEEDED') {
        return status(413, { error: 'Storage quota exceeded. Limit is 1 GB.' })
      }
      throw err
    }
  }, {
    auth: true,
    body: UploadFileBody,
    response: { 201: StorageFileResponse, 413: ErrorResponse, 503: ErrorResponse },
    detail: { tags: ['Storage'], summary: 'Upload file to R2' },
  })

  .get('/storage/files/:id/url', async ({ user, status, params }) => {
    if (!env.R2_ACCESS_KEY_ID) return status(503, { error: 'R2 not configured' })
    const url = await getFileSignedUrl(user.id, params.id)
    if (!url) return status(404, { message: 'Not found' })
    return { url }
  }, {
    auth: true,
    response: { 200: StorageSignedUrlResponse, 404: NotFoundResponse, 503: ErrorResponse },
    detail: { tags: ['Storage'], summary: 'Get signed download URL' },
  })

  .patch('/storage/files/:id', async ({ user, status, params, body }) => {
    const updated = await renameFile(user.id, params.id, body.name)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: RenameBody,
    response: { 200: StorageFileResponse, 404: NotFoundResponse },
    detail: { tags: ['Storage'], summary: 'Rename file' },
  })

  .patch('/storage/folders/:id', async ({ user, status, params, body }) => {
    const updated = await renameFolder(user.id, params.id, body.name)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: RenameBody,
    response: { 200: StorageFolderResponse, 404: NotFoundResponse },
    detail: { tags: ['Storage'], summary: 'Rename folder' },
  })

  .patch('/storage/files/bulk-move', async ({ user, body }) => {
    const moved = await bulkMoveFiles(user.id, body.fileIds, body.folderId)
    return moved
  }, {
    auth: true,
    body: BulkMoveBody,
    response: { 200: StorageFilesListResponse },
    detail: { tags: ['Storage'], summary: 'Bulk move files to a folder' },
  })

  .get('/storage/quota', async ({ user }) => {
    return getStorageQuota(user.id)
  }, {
    auth: true,
    response: { 200: StorageQuotaResponse },
    detail: { tags: ['Storage'], summary: 'Get storage quota usage' },
  })

  .patch('/storage/files/:id/tags', async ({ user, status, params, body }) => {
    const updated = await updateFileTags(user.id, params.id, body.tags)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: TagsBody,
    response: { 200: StorageFileResponse, 404: NotFoundResponse },
    detail: { tags: ['Storage'], summary: 'Update file tags' },
  })

  .get('/storage/folders/:id/download', async ({ user, status, params }) => {
    if (!env.R2_ACCESS_KEY_ID) return status(503, { error: 'R2 not configured' })
    const result = await buildFolderZip(user.id, params.id)
    if (!result) return status(404, { message: 'Not found' })
    return new Response(result.zip.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.folderName}.zip"`,
      },
    })
  }, { auth: true, detail: { tags: ['Storage'], summary: 'Download folder as ZIP' } })
