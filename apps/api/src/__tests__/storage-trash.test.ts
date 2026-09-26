import { afterEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { users, storageFiles } from '@mana/db'
import { db } from '@api/db'
import { listTrashedFiles, restoreFile } from '@api/modules/storage/service'

const createdUserIds: string[] = []

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Storage Test User', email: `storage-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

async function createTrashedFile(userId: string, name: string, deletedAt: Date) {
  const [file] = await db
    .insert(storageFiles)
    .values({
      userId,
      name,
      kind: 'document',
      sizeBytes: 1,
      mimeType: 'text/plain',
      r2Key: `tests/${crypto.randomUUID()}/${name}`,
      deletedAt,
    })
    .returning()
  return file
}

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(storageFiles).where(eq(storageFiles.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('storage trash retention', () => {
  it('hides and blocks restore for files past the retention cutoff', async () => {
    const user = await createUser()
    const expired = await createTrashedFile(user.id, 'expired.txt', new Date(Date.now() - 15 * 86_400_000))
    const restorable = await createTrashedFile(user.id, 'restorable.txt', new Date(Date.now() - 1 * 86_400_000))

    const trash = await listTrashedFiles(user.id)
    expect(trash.map((file) => file.id)).toEqual([restorable.id])

    expect(await restoreFile(user.id, expired.id)).toBeNull()
    expect((await restoreFile(user.id, restorable.id))?.deletedAt).toBeNull()
  })
})
