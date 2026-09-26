import { t } from 'elysia'

export const CreateFolderBody = t.Object({
  name: t.String(),
  parentId: t.Optional(t.String()),
  entityType: t.Optional(t.String()),
  entityId: t.Optional(t.String()),
  color: t.Optional(t.String()),
})

export const UploadFileBody = t.Object({
  file: t.File(),
  kind: t.String(),
  folderId: t.Optional(t.String()),
  entityType: t.Optional(t.String()),
  entityId: t.Optional(t.String()),
})

export const FilesQuery = t.Object({
  folderId: t.Optional(t.String()),
  q: t.Optional(t.String()),
})

export const RenameBody = t.Object({
  name: t.String(),
})

export const BulkMoveBody = t.Object({
  fileIds: t.Array(t.String()),
  folderId: t.Union([t.String(), t.Null()]),
})

export const TagsBody = t.Object({
  tags: t.Array(t.String()),
})
