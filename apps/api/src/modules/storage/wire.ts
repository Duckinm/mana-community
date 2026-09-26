import type { storageFiles, storageFolders } from '@mana/db'
import { wireTimestamps, type WireTimestamps } from '@api/lib/wire-row'
import { parseFileKind, parseStorageEntityType, type FileKind, type StorageEntityType } from '@api/lib/wire-enums'

type StorageFileRow = typeof storageFiles.$inferSelect
type StorageFolderRow = typeof storageFolders.$inferSelect

const FILE_KEYS = ['uploadedAt', 'updatedAt', 'deletedAt'] as const satisfies readonly (keyof StorageFileRow)[]
const FOLDER_KEYS = ['createdAt', 'updatedAt'] as const satisfies readonly (keyof StorageFolderRow)[]

export function storageFileToWire<T extends StorageFileRow>(
  file: T,
): Omit<WireTimestamps<T, typeof FILE_KEYS[number]>, 'kind'> & { kind: FileKind } {
  const wired = wireTimestamps(file, FILE_KEYS)
  return {
    ...wired,
    kind: parseFileKind(String(wired.kind)),
  }
}

export function storageFolderToWire<T extends StorageFolderRow>(
  folder: T,
): Omit<WireTimestamps<T, typeof FOLDER_KEYS[number]>, 'entityType'> & { entityType: StorageEntityType | null } {
  const wired = wireTimestamps(folder, FOLDER_KEYS)
  return {
    ...wired,
    entityType: wired.entityType ? parseStorageEntityType(String(wired.entityType)) : null,
  }
}
