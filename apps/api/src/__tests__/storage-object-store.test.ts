import { afterEach, describe, expect, it } from 'bun:test'
import { storageFiles, users } from '@mana/db'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { createStorageObjectOperations } from '@api/modules/storage/service'
import type { ObjectStore } from '@api/modules/storage/object-store'

class MemoryObjectStore implements ObjectStore {
  readonly objects = new Map<string, Uint8Array>()
  readonly deleted: string[] = []

  async put(key: string, body: Uint8Array) {
    this.objects.set(key, body)
  }

  async delete(key: string) {
    this.deleted.push(key)
    this.objects.delete(key)
  }

  async get(key: string) {
    return this.objects.get(key) ?? null
  }

  async copy(sourceKey: string, targetKey: string) {
    const value = this.objects.get(sourceKey)
    if (!value) throw new Error('Object not found')
    this.objects.set(targetKey, value)
  }

  async signGet(key: string, expiresInSeconds: number, responseContentDisposition?: string) {
    return `memory://${key}?expires=${expiresInSeconds}`
  }
}

const createdUserIds: string[] = []

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Object Store Test', email: `object-store-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(storageFiles).where(eq(storageFiles.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('storage object operations', () => {
  it('stores bytes and signs downloads through the object-store interface', async () => {
    const user = await createUser()
    const store = new MemoryObjectStore()
    const fileId = crypto.randomUUID()
    const operations = createStorageObjectOperations(store, () => fileId)

    const uploaded = await operations.uploadFile(
      user.id,
      new File(['hello'], 'hello.txt', { type: 'text/plain' }),
      { kind: 'document' },
    )

    const key = `files/${user.id}/${fileId}/hello.txt`
    expect(uploaded.id).toBe(fileId)
    expect(new TextDecoder().decode(store.objects.get(key))).toBe('hello')
    expect(await operations.getFileSignedUrl(user.id, fileId)).toBe(
      `memory://${key}?expires=3600`,
    )
  })

  it('removes an uploaded object when its metadata insert fails', async () => {
    const user = await createUser()
    const store = new MemoryObjectStore()
    const fileId = crypto.randomUUID()
    const operations = createStorageObjectOperations(store, () => fileId)

    await operations.uploadFile(user.id, new File(['first'], 'first.txt'), { kind: 'document' })
    await expect(
      operations.uploadFile(user.id, new File(['second'], 'second.txt'), { kind: 'document' }),
    ).rejects.toThrow()

    const firstKey = `files/${user.id}/${fileId}/first.txt`
    const secondKey = `files/${user.id}/${fileId}/second.txt`
    expect(store.objects.has(firstKey)).toBe(true)
    expect(store.objects.has(secondKey)).toBe(false)
    expect(store.deleted).toContain(secondKey)
  })
})
