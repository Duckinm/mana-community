import { zipSync } from 'fflate'
import { eq, and, isNull, isNotNull, ilike, inArray, sum, count, gt, lte } from 'drizzle-orm'
import { db } from '@api/db'
import { storageFolders, storageFiles, fileLinks } from '@mana/db'
import { logFileUploaded } from '@api/lib/activity'
import { activityScopeForProject } from '@api/lib/activity-helpers'
import { storageTrashCutoffDate } from '@api/lib/storage-trash'
import { storageFileToWire, storageFolderToWire } from '@api/modules/storage/wire'
import { r2ObjectStore, type ObjectStore } from '@api/modules/storage/object-store'

function parseFileTags<T extends { tags: string | null }>(file: T): Omit<T, 'tags'> & { tags: string[] } {
  return { ...file, tags: file.tags ? (JSON.parse(file.tags) as string[]) : [] }
}

function formatStorageFile(file: typeof storageFiles.$inferSelect) {
  const wired = storageFileToWire(file)
  return parseFileTags(wired)
}

function activeFile(userId: string) {
  return and(eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt))
}

export async function listFolders(userId: string) {
  const rows = await db.select().from(storageFolders).where(eq(storageFolders.userId, userId))
  return rows.map(storageFolderToWire)
}

export async function createFolder(
  userId: string,
  body: { name: string; parentId?: string; entityType?: string; entityId?: string; color?: string },
) {
  if (body.entityType && body.entityId) {
    const [existing] = await db
      .select()
      .from(storageFolders)
      .where(
        and(
          eq(storageFolders.userId, userId),
          eq(storageFolders.entityType, body.entityType),
          eq(storageFolders.entityId, body.entityId),
        ),
      )
    if (existing) return storageFolderToWire(existing)
  }

  const [row] = await db.insert(storageFolders).values({
    userId,
    name: body.name,
    parentId: body.parentId ?? null,
    entityType: body.entityType ?? null,
    entityId: body.entityId ?? null,
    color: body.color ?? null,
  }).returning()
  return storageFolderToWire(row)
}

export async function deleteFolder(userId: string, folderId: string) {
  const [folder] = await db
    .select()
    .from(storageFolders)
    .where(and(eq(storageFolders.id, folderId), eq(storageFolders.userId, userId)))

  if (!folder) return false

  const files = await db
    .select()
    .from(storageFiles)
    .where(and(eq(storageFiles.folderId, folderId), eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt)))

  await Promise.all(files.map((f) => softDeleteFile(userId, f.id)))

  await db.delete(storageFolders).where(eq(storageFolders.id, folderId))
  return true
}

export async function listFiles(userId: string, folderId?: string) {
  const conditions = [activeFile(userId)!]
  if (folderId) {
    conditions.push(eq(storageFiles.folderId, folderId))
  } else if (folderId === null) {
    conditions.push(isNull(storageFiles.folderId))
  }
  const rows = await db.select().from(storageFiles).where(and(...conditions))
  return rows.map(formatStorageFile)
}

export async function listTrashedFiles(userId: string) {
  const cutoff = storageTrashCutoffDate()
  const rows = await db
    .select()
    .from(storageFiles)
    .where(and(eq(storageFiles.userId, userId), isNotNull(storageFiles.deletedAt), gt(storageFiles.deletedAt, cutoff)))
  return rows.map(formatStorageFile)
}

export async function softDeleteFile(userId: string, fileId: string) {
  const [updated] = await db
    .update(storageFiles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(storageFiles.id, fileId),
      eq(storageFiles.userId, userId),
      isNull(storageFiles.deletedAt),
    ))
    .returning()
  return updated ? formatStorageFile(updated) : null
}

export async function restoreFile(userId: string, fileId: string) {
  const cutoff = storageTrashCutoffDate()
  const [updated] = await db
    .update(storageFiles)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(
      eq(storageFiles.id, fileId),
      eq(storageFiles.userId, userId),
      isNotNull(storageFiles.deletedAt),
      gt(storageFiles.deletedAt, cutoff),
    ))
    .returning()
  return updated ? formatStorageFile(updated) : null
}

export function createStorageObjectOperations(
  store: ObjectStore,
  createFileId: () => string = () => crypto.randomUUID(),
) {
  async function permanentlyDeleteFile(file: { id: string; r2Key: string }) {
    await store.delete(file.r2Key)
    await db.delete(storageFiles).where(eq(storageFiles.id, file.id))
  }

  async function purgeExpiredStorageTrash() {
    const cutoff = storageTrashCutoffDate()
    const expired = await db
      .select()
      .from(storageFiles)
      .where(and(isNotNull(storageFiles.deletedAt), lte(storageFiles.deletedAt, cutoff)))

    await Promise.all(expired.map(permanentlyDeleteFile))
    return expired.length
  }

  async function uploadFile(
    userId: string,
    file: File,
    body: { kind: string; folderId?: string; entityType?: string; entityId?: string },
  ) {

    const fileId = createFileId()
    const key = `files/${userId}/${fileId}/${file.name}`
    const contentType = file.type || 'application/octet-stream'
    const buffer = new Uint8Array(await file.arrayBuffer())
    await store.put(key, buffer, contentType)

    let record: typeof storageFiles.$inferSelect
    try {
      const [inserted] = await db.insert(storageFiles).values({
        id: fileId,
        userId,
        name: file.name,
        kind: body.kind,
        sizeBytes: file.size,
        mimeType: contentType,
        folderId: body.folderId ?? null,
        r2Key: key,
      }).returning()
      record = inserted
    } catch (error) {
      await store.delete(key)
      throw error
    }

    if (body.entityType && body.entityId) {
      await db.insert(fileLinks).values({
        fileId: record.id,
        entityType: body.entityType,
        entityId: body.entityId,
      })

      if (body.entityType === 'contact') {
        logFileUploaded(record, userId, { entityType: 'contact', entityId: body.entityId, contactId: body.entityId })
      } else if (body.entityType === 'project') {
        const scope = await activityScopeForProject(userId, body.entityId)
        logFileUploaded(record, userId, { entityType: 'project', entityId: body.entityId, projectId: scope.projectId, contactId: scope.contactId })
      }
    } else if (body.folderId) {
      const [folder] = await db
        .select({ entityType: storageFolders.entityType, entityId: storageFolders.entityId })
        .from(storageFolders)
        .where(and(eq(storageFolders.id, body.folderId), eq(storageFolders.userId, userId)))

      if (folder?.entityType === 'contact' && folder.entityId) {
        logFileUploaded(record, userId, { entityType: 'contact', entityId: folder.entityId, contactId: folder.entityId })
      } else if (folder?.entityType === 'project' && folder.entityId) {
        const scope = await activityScopeForProject(userId, folder.entityId)
        logFileUploaded(record, userId, { entityType: 'project', entityId: folder.entityId, projectId: scope.projectId, contactId: scope.contactId })
      }
    }

    return formatStorageFile(record)
  }

  async function getFileSignedUrl(userId: string, fileId: string) {
    const [file] = await db
      .select()
      .from(storageFiles)
      .where(and(eq(storageFiles.id, fileId), eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt)))

    return file ? store.signGet(file.r2Key, 3600) : null
  }

  async function buildFolderZip(
    userId: string,
    folderId: string,
  ): Promise<{ zip: Uint8Array; folderName: string } | null> {
    const [folder] = await db
      .select()
      .from(storageFolders)
      .where(and(eq(storageFolders.id, folderId), eq(storageFolders.userId, userId)))
    if (!folder) return null

    const files = await db
      .select()
      .from(storageFiles)
      .where(and(eq(storageFiles.folderId, folderId), activeFile(userId)!))

    const zipData: Record<string, Uint8Array> = {}
    await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await store.get(file.r2Key)
          if (buffer) zipData[file.name] = buffer
        } catch {}
      }),
    )

    return { zip: zipSync(zipData), folderName: folder.name }
  }

  return { purgeExpiredStorageTrash, uploadFile, getFileSignedUrl, buildFolderZip }
}

export const {
  purgeExpiredStorageTrash,
  uploadFile,
  getFileSignedUrl,
  buildFolderZip,
} = createStorageObjectOperations(r2ObjectStore)

export async function renameFile(userId: string, fileId: string, name: string) {
  const [updated] = await db
    .update(storageFiles)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(storageFiles.id, fileId), eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt)))
    .returning()
  return updated ? formatStorageFile(updated) : null
}

export async function renameFolder(userId: string, folderId: string, name: string) {
  const [updated] = await db
    .update(storageFolders)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(storageFolders.id, folderId), eq(storageFolders.userId, userId)))
    .returning()
  return updated ? storageFolderToWire(updated) : null
}

export async function searchFiles(userId: string, q: string) {
  const rows = await db
    .select({
      id: storageFiles.id,
      userId: storageFiles.userId,
      name: storageFiles.name,
      kind: storageFiles.kind,
      sizeBytes: storageFiles.sizeBytes,
      mimeType: storageFiles.mimeType,
      folderId: storageFiles.folderId,
      r2Key: storageFiles.r2Key,
      tags: storageFiles.tags,
      uploadedAt: storageFiles.uploadedAt,
      updatedAt: storageFiles.updatedAt,
      deletedAt: storageFiles.deletedAt,
      folderName: storageFolders.name,
    })
    .from(storageFiles)
    .leftJoin(storageFolders, eq(storageFiles.folderId, storageFolders.id))
    .where(and(activeFile(userId)!, ilike(storageFiles.name, `%${q}%`)))
  return rows.map((r) => ({
    ...formatStorageFile(r),
    folderName: r.folderName,
  }))
}

export async function bulkMoveFiles(userId: string, fileIds: string[], folderId: string | null) {
  if (fileIds.length === 0) return []

  const owned = await db
    .select({ id: storageFiles.id })
    .from(storageFiles)
    .where(and(activeFile(userId)!, inArray(storageFiles.id, fileIds)))

  const ownedIds = owned.map((f) => f.id)
  if (ownedIds.length === 0) return []

  const moved = await db
    .update(storageFiles)
    .set({ folderId, updatedAt: new Date() })
    .where(and(eq(storageFiles.userId, userId), inArray(storageFiles.id, ownedIds)))
    .returning()

  return moved.map(formatStorageFile)
}

export async function getStorageQuota(userId: string) {
  const [result] = await db
    .select({ usedBytes: sum(storageFiles.sizeBytes), fileCount: count(storageFiles.id) })
    .from(storageFiles)
    .where(and(eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt)))
  return {
    usedBytes: Number(result?.usedBytes ?? 0),
    fileCount: Number(result?.fileCount ?? 0),
    limitBytes: null,
  }
}

export async function updateFileTags(userId: string, fileId: string, tags: string[]) {
  const [updated] = await db
    .update(storageFiles)
    .set({ tags: JSON.stringify(tags), updatedAt: new Date() })
    .where(and(eq(storageFiles.id, fileId), eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt)))
    .returning()
  return updated ? formatStorageFile(updated) : null
}
