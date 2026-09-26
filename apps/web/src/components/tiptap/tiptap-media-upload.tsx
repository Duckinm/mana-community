import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { client, expectEden } from '@/lib/eden'
import i18next from '@/lib/i18n'
import {
  canFitStorageFile,
  isStorageQuotaFull,
  parseStorageUploadError,
} from '@/lib/storage-quota'
import { toast } from 'sonner'

const BASE_URL = resolveApiBaseUrl()

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)
    const cleanup = () => input.remove()
    input.onchange = () => {
      resolve(input.files?.[0] ?? null)
      cleanup()
    }
    input.click()
  })
}

export type EditorUploadContext = { entityType: string; entityId: string }

function notifyQuotaBlocked() {
  toast.error(i18next.t('storage:quotaFullTitle'), {
    description: i18next.t('storage:quotaFullDescription'),
  })
}

async function assertCanUpload(file: File): Promise<boolean> {
  try {
    const quota = expectEden(await client.api.storage.quota.get())
    if (
      isStorageQuotaFull(quota.usedBytes) ||
      !canFitStorageFile(quota.usedBytes, file.size)
    ) {
      notifyQuotaBlocked()
      return false
    }
  } catch {
    toast.error(i18next.t('storage:quotaFullTitle'))
    return false
  }
  return true
}

async function uploadFile(file: File, context?: EditorUploadContext): Promise<{ id: string; url: string; name: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other')
  if (context) {
    form.append('entityType', context.entityType)
    form.append('entityId', context.entityId)
  }

  const uploadRes = await fetch(`${BASE_URL}/api/storage/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => null)
    const message = parseStorageUploadError(err, uploadRes.statusText)
    toast.error(message)
    throw new Error(message)
  }
  const stored = (await uploadRes.json()) as { id: string; name: string }

  const { url } = expectEden(await client.api.storage.files({ id: stored.id }).url.get())
  if (!url) throw new Error('Failed to get file URL')

  return { id: stored.id, url, name: stored.name }
}

export async function uploadEditorMedia(accept: string, context?: EditorUploadContext) {
  const file = await pickFile(accept)
  if (!file) return null

  const allowed = await assertCanUpload(file)
  if (!allowed) return null

  try {
    return await uploadFile(file, context)
  } catch {
    return null
  }
}

export async function deleteEditorMedia(fileId: string) {
  const res = await client.api.storage.files({ id: fileId }).delete()
  if (res.error) {
    toast.error(i18next.t('mediaDeleteFailed', { ns: 'common' }))
  }
}

export async function restoreEditorMedia(fileId: string) {
  const res = await client.api.storage.files({ id: fileId }).restore.post()
  if (res.error) {
    toast.error(i18next.t('mediaRestoreFailed', { ns: 'common' }))
  }
}

export async function resolveEditorMediaUrl(fileId: string): Promise<string | null> {
  const res = await client.api.storage.files({ id: fileId }).url.get()
  return res.data?.url ?? null
}
