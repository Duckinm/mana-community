import { eq, and, desc, asc, count, sum, ilike, isNull, inArray } from 'drizzle-orm'
import { storageFiles, storageFolders, fileLinks } from '@mana/db'
import { db } from '@api/db'
import { logFileSavedViaAI } from '@api/lib/activity'
import { uploadFile, getFileSignedUrl, createFolder, deleteFolder, renameFolder, renameFile, softDeleteFile } from '@api/modules/storage/service'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

const EXTERNAL_LIST_DEFAULT_LIMIT = 50
const EXTERNAL_LIST_MAX_LIMIT = 100
const externalLimitSchema = {
  type: 'integer' as const,
  minimum: 1,
  maximum: EXTERNAL_LIST_MAX_LIMIT,
  default: EXTERNAL_LIST_DEFAULT_LIMIT,
  description: 'External MCP response limit. Default 50, maximum 100; the in-app assistant keeps its full context.',
}

function externalListLimit(args: Record<string, unknown>, context?: ToolContext) {
  if (context?.source !== 'external-mcp') return null
  const value = args.limit
  if (value === undefined) return EXTERNAL_LIST_DEFAULT_LIMIT
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > EXTERNAL_LIST_MAX_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${EXTERNAL_LIST_MAX_LIMIT}`)
  }
  return value
}

function activeFiles(userId: string) {
  return and(eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt))
}

async function queryStorageSummary(userId: string) {
  const [fileCount] = await db.select({ count: count() }).from(storageFiles).where(activeFiles(userId))
  const [folderCount] = await db.select({ count: count() }).from(storageFolders).where(eq(storageFolders.userId, userId))
  const [sizeRow] = await db.select({ totalBytes: sum(storageFiles.sizeBytes) }).from(storageFiles).where(activeFiles(userId))

  const byKindRows = await db
    .select({ kind: storageFiles.kind, n: count() })
    .from(storageFiles)
    .where(activeFiles(userId))
    .groupBy(storageFiles.kind)

  const byKind: Record<string, number> = {}
  for (const row of byKindRows) {
    const k = row.kind ?? 'other'
    byKind[k] = row.n
  }

  const recentFiles = await db
    .select({ name: storageFiles.name, kind: storageFiles.kind })
    .from(storageFiles)
    .where(activeFiles(userId))
    .orderBy(desc(storageFiles.uploadedAt))
    .limit(5)

  const totalBytes = Number(sizeRow?.totalBytes ?? 0)
  return {
    totalFiles: fileCount?.count ?? 0,
    totalFolders: folderCount?.count ?? 0,
    totalSizeMb: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
    byKind,
    recentFiles,
  }
}

async function queryFiles(userId: string, folderId?: string | null, limit = 50) {
  const conditions = [activeFiles(userId)!]
  if (folderId !== undefined) {
    if (folderId === null) {
      conditions.push(isNull(storageFiles.folderId))
    } else {
      conditions.push(eq(storageFiles.folderId, folderId))
    }
  }

  const rows = await db
    .select({
      id: storageFiles.id,
      name: storageFiles.name,
      kind: storageFiles.kind,
      sizeBytes: storageFiles.sizeBytes,
      uploadedAt: storageFiles.uploadedAt,
      folderId: storageFiles.folderId,
    })
    .from(storageFiles)
    .where(and(...conditions))
    .orderBy(desc(storageFiles.uploadedAt))
    .limit(limit)

  return rows.map((f) => ({ ...f, uploadedAt: f.uploadedAt }))
}

async function queryFilesBounded(userId: string, folderId: string | null | undefined, limit: number) {
  const rows = await queryFiles(userId, folderId, limit + 1)
  return {
    items: rows.slice(0, limit),
    limit,
    hasMore: rows.length > limit,
  }
}

async function queryFolders(userId: string, limit?: number) {
  const query = db
    .select({ id: storageFolders.id, name: storageFolders.name, parentId: storageFolders.parentId, createdAt: storageFolders.createdAt })
    .from(storageFolders)
    .where(eq(storageFolders.userId, userId))
    .orderBy(asc(storageFolders.name))
  const rows = limit === undefined ? await query : await query.limit(limit)

  return rows.map((f) => ({ ...f, createdAt: f.createdAt }))
}

async function queryFoldersBounded(userId: string, limit: number) {
  const rows = await queryFolders(userId, limit + 1)
  return {
    items: rows.slice(0, limit),
    limit,
    hasMore: rows.length > limit,
  }
}

async function searchStorageFiles(userId: string, query: string, kind?: string, limit?: number) {
  const conditions = [activeFiles(userId)!, ilike(storageFiles.name, `%${query}%`)]
  if (kind) conditions.push(eq(storageFiles.kind, kind))
  const selection = db
    .select({
      id: storageFiles.id,
      name: storageFiles.name,
      kind: storageFiles.kind,
      sizeBytes: storageFiles.sizeBytes,
      uploadedAt: storageFiles.uploadedAt,
      folderId: storageFiles.folderId,
    })
    .from(storageFiles)
    .where(and(...conditions))
    .orderBy(desc(storageFiles.uploadedAt))
  const rows = limit === undefined ? await selection : await selection.limit(limit)

  return rows.map((f) => ({ ...f, uploadedAt: f.uploadedAt }))
}

async function searchStorageFilesBounded(userId: string, query: string, kind: string | undefined, limit: number) {
  const rows = await searchStorageFiles(userId, query, kind, limit + 1)
  return {
    items: rows.slice(0, limit),
    limit,
    hasMore: rows.length > limit,
  }
}

async function moveFile(userId: string, fileId: string, folderId: string | null) {
  const [updated] = await db
    .update(storageFiles)
    .set({ folderId })
    .where(and(eq(storageFiles.id, fileId), eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt)))
    .returning({ id: storageFiles.id })

  if (!updated) return { moved: false, message: 'File not found' }
  return { moved: true, fileId, folderId }
}

export async function listFilesByEntity(userId: string, entityType: string, entityId: string, limit?: number) {
  const links = await db
    .select({ fileId: fileLinks.fileId })
    .from(fileLinks)
    .where(and(eq(fileLinks.entityType, entityType), eq(fileLinks.entityId, entityId)))

  const fileIds = links.map((l) => l.fileId)
  if (fileIds.length === 0) return []

  const query = db
    .select({
      id: storageFiles.id,
      name: storageFiles.name,
      kind: storageFiles.kind,
      sizeBytes: storageFiles.sizeBytes,
      uploadedAt: storageFiles.uploadedAt,
      folderId: storageFiles.folderId,
    })
    .from(storageFiles)
    .where(and(activeFiles(userId)!, inArray(storageFiles.id, fileIds)))
    .orderBy(desc(storageFiles.uploadedAt))
  const rows = limit === undefined ? await query : await query.limit(limit)

  return rows.map((f) => ({ ...f, uploadedAt: f.uploadedAt }))
}

async function deleteStorageFileRecord(userId: string, fileId: string) {
  const trashed = await softDeleteFile(userId, fileId)
  if (!trashed) return { deleted: false, message: 'File not found' }
  return { deleted: true, fileId, trashed: true }
}

export const storageTools = [
  {
    name: 'get_storage_summary',
    description: 'Get storage usage summary: file count, total size, breakdown by file type',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'list_files',
    description: 'List files in storage, optionally filtered by folder. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        folderId: { type: 'string', description: 'Folder ID to filter by; omit to list across all folders' },
        limit: externalLimitSchema,
      },
      required: [],
    },
  },
  {
    name: 'list_folders',
    description: 'List folders for the user, sorted by name. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: { limit: externalLimitSchema },
      required: [],
    },
  },
  {
    name: 'search_files',
    description: 'Search files by name substring (case-insensitive), optionally filtered by kind. External MCP returns a bounded result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Substring to match against file name' },
        kind: { type: 'string', enum: ['image', 'document', 'video', 'audio', 'other'], description: 'Optional file kind filter' },
        limit: externalLimitSchema,
      },
      required: ['query'],
    },
  },
  {
    name: 'move_file',
    description: 'Move a file to a different folder. Pass null for folderId to move to root.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fileId: { type: 'string' },
        folderId: { type: ['string', 'null'], description: 'Target folder ID, or null to move to root' },
      },
      required: ['fileId', 'folderId'],
    },
  },
  {
    name: 'delete_file',
    description: 'Move a file to trash (recoverable for 14 days). Physical R2 cleanup happens after retention expires.',
    input_schema: {
      type: 'object' as const,
      properties: { fileId: { type: 'string' } },
      required: ['fileId'],
    },
  },
  {
    name: 'list_files_by_entity',
    description: 'List files linked to a project, contact, transaction, or task via file links. External MCP returns a bounded result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entityType: { type: 'string', enum: ['project', 'contact', 'transaction', 'task'] },
        entityId: { type: 'string' },
        limit: externalLimitSchema,
      },
      required: ['entityType', 'entityId'],
    },
  },
  {
    name: 'get_download_url',
    description: 'Get a signed download URL for a file, valid for 1 hour',
    input_schema: {
      type: 'object' as const,
      properties: { fileId: { type: 'string' } },
      required: ['fileId'],
    },
  },
  {
    name: 'upload_file_to_storage',
    description: "Save an attached file to the user's storage system. Steps: 1) If user mentions a contact (e.g. 'save to Sarah'), first call get_contacts to find the contactId, then call this tool with that contactId. 2) If user mentions a folder name, use folderName. 3) If no destination given, save to root storage. Always call this tool directly — never ask the user for clarification about folders.",
    input_schema: {
      type: 'object' as const,
      properties: {
        fileName: { type: 'string', description: 'The exact name of the attached file to save (as shown in the [Attached: ...] tag)' },
        contactId: { type: 'string', description: 'Contact ID to save the file into that contact folder. Use get_contacts first to find the ID.' },
        folderId: { type: 'string', description: 'Specific folder ID to save into (optional, prefer contactId when a contact is mentioned)' },
        folderName: { type: 'string', description: 'Folder name to search and save into (fallback if no contactId or folderId)' },
      },
      required: ['fileName'],
    },
  },
  {
    name: 'create_folder',
    description: 'Create a new storage folder, optionally nested under a parent folder',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Folder name' },
        parentId: { type: 'string', description: 'Parent folder ID (omit for root)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_folder',
    description: 'Delete a folder and all files inside it from storage and R2',
    input_schema: {
      type: 'object' as const,
      properties: { folderId: { type: 'string' } },
      required: ['folderId'],
    },
  },
  {
    name: 'rename_folder',
    description: 'Rename a storage folder',
    input_schema: {
      type: 'object' as const,
      properties: {
        folderId: { type: 'string' },
        name: { type: 'string', description: 'New folder name' },
      },
      required: ['folderId', 'name'],
    },
  },
  {
    name: 'rename_file',
    description: 'Rename a file in storage',
    input_schema: {
      type: 'object' as const,
      properties: {
        fileId: { type: 'string' },
        name: { type: 'string', description: 'New file name' },
      },
      required: ['fileId', 'name'],
    },
  },
] as const

export const storageHandlers: Record<string, McpToolHandler> = {
  'get_storage_summary': (userId) => queryStorageSummary(userId),
  'list_files': async (userId, args, context) => {
    const folderId = 'folderId' in args
      ? (typeof args.folderId === 'string' ? args.folderId : null)
      : undefined
    const externalLimit = externalListLimit(args, context)
    if (externalLimit !== null) return queryFilesBounded(userId, folderId, externalLimit)
    const limit = typeof args.limit === 'number' ? args.limit : 50
    return queryFiles(userId, folderId, limit)
  },
  'list_folders': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null ? queryFolders(userId) : queryFoldersBounded(userId, limit)
  },
  'search_files': async (userId, args, context) => {
    if (typeof args.query !== 'string') throw new Error('search_files requires query string')
    const kind = typeof args.kind === 'string' ? args.kind : undefined
    const limit = externalListLimit(args, context)
    return limit === null
      ? searchStorageFiles(userId, args.query, kind)
      : searchStorageFilesBounded(userId, args.query, kind, limit)
  },
  'move_file': async (userId, args) => {
    if (typeof args.fileId !== 'string') throw new Error('move_file requires fileId string')
    if (!('folderId' in args)) throw new Error('move_file requires folderId (string or null)')
    const targetFolder = args.folderId === null ? null : typeof args.folderId === 'string' ? args.folderId : null
    return moveFile(userId, args.fileId, targetFolder)
  },
  'delete_file': async (userId, args) => {
    if (typeof args.fileId !== 'string') throw new Error('delete_file requires fileId string')
    return deleteStorageFileRecord(userId, args.fileId)
  },
  'list_files_by_entity': async (userId, args, context) => {
    if (typeof args.entityType !== 'string') throw new Error('list_files_by_entity requires entityType')
    if (typeof args.entityId !== 'string') throw new Error('list_files_by_entity requires entityId')
    const limit = externalListLimit(args, context)
    if (limit === null) return listFilesByEntity(userId, args.entityType, args.entityId)
    const rows = await listFilesByEntity(userId, args.entityType, args.entityId, limit + 1)
    return {
      items: rows.slice(0, limit),
      limit,
      hasMore: rows.length > limit,
    }
  },
  'get_download_url': async (userId, args) => {
    if (typeof args.fileId !== 'string') throw new Error('get_download_url requires fileId string')
    const url = await getFileSignedUrl(userId, args.fileId)
    if (!url) return { found: false, message: 'File not found' }
    return { url, expiresIn: 3600 }
  },
  'create_folder': async (userId, args) => {
    if (typeof args.name !== 'string') throw new Error('create_folder requires name')
    return createFolder(userId, { name: args.name, parentId: typeof args.parentId === 'string' ? args.parentId : undefined })
  },
  'delete_folder': async (userId, args) => {
    if (typeof args.folderId !== 'string') throw new Error('delete_folder requires folderId')
    const deleted = await deleteFolder(userId, args.folderId)
    return { deleted, folderId: args.folderId }
  },
  'rename_folder': async (userId, args) => {
    if (typeof args.folderId !== 'string') throw new Error('rename_folder requires folderId')
    if (typeof args.name !== 'string') throw new Error('rename_folder requires name')
    const folder = await renameFolder(userId, args.folderId, args.name)
    if (!folder) return { renamed: false, message: 'Folder not found' }
    return { renamed: true, folder }
  },
  'rename_file': async (userId, args) => {
    if (typeof args.fileId !== 'string') throw new Error('rename_file requires fileId')
    if (typeof args.name !== 'string') throw new Error('rename_file requires name')
    const file = await renameFile(userId, args.fileId, args.name)
    if (!file) return { renamed: false, message: 'File not found' }
    return { renamed: true, file }
  },
  'upload_file_to_storage': async (userId, args, context) => {
    const fileName = typeof args.fileName === 'string' ? args.fileName : null
    if (!fileName) return { success: false, message: 'fileName is required' }

    const attachedFiles = context?.attachedFiles ?? []
    const fileData = attachedFiles.find(f => f.name === fileName) ?? (attachedFiles.length === 1 ? attachedFiles[0] : undefined)
    if (!fileData) return { success: false, message: 'No attached file found. Make sure to attach the file before sending.' }

    let resolvedFolderId: string | undefined

    if (typeof args.folderId === 'string') {
      resolvedFolderId = args.folderId
    } else if (typeof args.contactId === 'string') {
      const [folder] = await db.select({ id: storageFolders.id })
        .from(storageFolders)
        .where(and(
          eq(storageFolders.userId, userId),
          eq(storageFolders.entityType, 'contact'),
          eq(storageFolders.entityId, args.contactId),
        ))
        .limit(1)
      resolvedFolderId = folder?.id
    } else if (typeof args.folderName === 'string') {
      const [folder] = await db.select({ id: storageFolders.id })
        .from(storageFolders)
        .where(and(eq(storageFolders.userId, userId), ilike(storageFolders.name, `%${args.folderName}%`)))
        .limit(1)
      resolvedFolderId = folder?.id
    }

    const buffer = Buffer.from(fileData.data, 'base64')
    const blob = new Blob([buffer], { type: fileData.mediaType })
    const file = new File([blob], fileData.name, { type: fileData.mediaType })

    const kind = fileData.isImage ? 'image'
      : fileData.mediaType.includes('pdf') ? 'pdf'
      : fileData.mediaType.includes('text') ? 'doc'
      : 'other'

    const record = await uploadFile(userId, file, {
      kind,
      folderId: resolvedFolderId,
      entityType: typeof args.contactId === 'string' ? 'contact' : undefined,
      entityId: typeof args.contactId === 'string' ? args.contactId : undefined,
    }).catch((err: unknown) => {
      if (err instanceof Error && err.message === 'QUOTA_EXCEEDED') {
        return null
      }
      throw err
    })

    if (!record) {
      return {
        success: false,
        error: 'Storage quota exceeded. Limit is 1 GB.',
      }
    }

    logFileSavedViaAI(record, userId, typeof args.contactId === 'string' ? args.contactId : null)
    return {
      success: true,
      fileId: record.id,
      fileName: record.name,
      folderId: resolvedFolderId ?? null,
      message: `"${record.name}" saved successfully to ${resolvedFolderId ? 'the specified folder' : 'your storage'}!`,
    }
  },
}
