// Storage system types — junction table architecture
// Files are identified by UUID (flat S3 keys), hierarchy lives in DB via parentId tree
// One file can be linked to many entities via file_links junction table

export type EntityType = 'contact' | 'project' | 'transaction' | 'task'

export type FileKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'video' | 'archive' | 'other'

export interface StorageFolder {
  id: string
  name: string
  parentId: string | null  // null = root folder
  entityType: EntityType | null  // null = standalone folder
  entityId: string | null         // the contact/project/etc. this folder belongs to
  createdAt: string
  updatedAt?: string
  color?: string | null
}

export interface StorageFile {
  id: string           // UUID — also the R2 key: `files/{uuid}`
  name: string
  kind: FileKind
  sizeBytes: number
  mimeType: string
  folderId: string | null
  uploadedAt: string
  updatedAt?: string
  deletedAt?: string | null
  r2Key: string
  tags: string[]
  thumbnailUrl?: string
}

export interface FileLink {
  id: string
  fileId: string
  entityType: EntityType
  entityId: string
  createdAt: string
}
