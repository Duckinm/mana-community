import Elysia, { t } from 'elysia'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { getUser, updateUser, deleteUser, exportUser, getStartedStatus } from '@api/modules/user/service'
import { UpdateUserBody, UserResponse, AvatarUploadResponse, McpTokenRegenerateResponse, GetStartedResponse, NotFoundResponse } from '@api/modules/user/model'
import { MessageResponse, ErrorResponse } from '@api/lib/wire-schema'
import { logUserUpdatedSettings } from '@api/lib/activity'
import { r2, R2_PUBLIC_BUCKET } from '@api/utils/r2'
import { buildPublicUrl, extractR2Key } from '@api/utils/r2/public-url'
import { env } from '@api/env'
import { mcpToolGroups, mcpToolNames } from '@api/utils/mcp-tools'
import { isExternalMcpToolName, toolGroupsForMcpCapability } from '@api/utils/mcp-tools/capabilities'

const McpToolGroupsResponse = t.Array(t.Object({ group: t.String(), tools: t.Array(t.String()) }))

export const userModule = new Elysia({ name: 'user', prefix: '/api/users' })
  .use(betterAuthPlugin)

  .get('/me', async ({ user, status }) => {
    const row = await getUser(user.id)
    if (!row) return status(404, { message: 'Not found' })
    return row
  }, { auth: true, response: { 200: UserResponse, 404: NotFoundResponse }, detail: { tags: ['Users'], summary: 'Get current user' } })

  .get('/me/get-started', async ({ user }) => {
    return getStartedStatus(user.id)
  }, { auth: true, response: { 200: GetStartedResponse }, detail: { tags: ['Users'], summary: 'Get-started checklist status for current user' } })

  .patch('/me', async ({ user, body, status }) => {
    if (body.disabledAiTools) {
      body.disabledAiTools = [...new Set(body.disabledAiTools.filter((name) => mcpToolNames.has(name)))]
    }
    if (body.disabledExternalMcpTools) {
      body.disabledExternalMcpTools = [...new Set(body.disabledExternalMcpTools.filter(isExternalMcpToolName))]
    }

    const updated = await updateUser(user.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    logUserUpdatedSettings(user.id, Object.keys(body))
    return updated
  }, {
    auth: true,
    body: UpdateUserBody,
    response: { 200: UserResponse, 404: NotFoundResponse },
    detail: { tags: ['Users'], summary: 'Update current user' },
  })

  .get('/ai-tools', () => mcpToolGroups, {
    auth: true,
    response: { 200: McpToolGroupsResponse },
    detail: { tags: ['Users'], summary: 'Chat agent tool catalog grouped by domain' },
  })

  .get('/tool-permissions', () => ({
    chat: mcpToolGroups,
    externalMcp: toolGroupsForMcpCapability(mcpToolGroups, 'external-mcp'),
  }), {
    auth: true,
    response: { 200: t.Object({ chat: McpToolGroupsResponse, externalMcp: McpToolGroupsResponse }) },
    detail: { tags: ['Users'], summary: 'Tool catalogs grouped by capability profile' },
  })

  .post('/avatar', async ({ user, body, status }) => {
    if (!env.R2_ACCESS_KEY_ID) {
      return status(503, { error: 'R2 not configured' })
    }

    const { data: base64Data, mediaType } = body as { data: string; mediaType: string }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(mediaType)) {
      return status(400, { message: 'Unsupported image type' })
    }

    let avatarUrl: string
    try {
      const buffer = Buffer.from(base64Data, 'base64')
      const ext = mediaType === 'image/jpeg' ? 'jpg' : (mediaType.split('/')[1] ?? 'jpg')
      const key = `avatars/${user.id}.${ext}`

      const current = await getUser(user.id)
      const oldKey = current?.image ? extractR2Key(current.image) : null
      if (oldKey?.startsWith('avatars/')) {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_PUBLIC_BUCKET, Key: oldKey })).catch(() => null)
      }

      await r2.send(new PutObjectCommand({
        Bucket: R2_PUBLIC_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mediaType,
        ContentLength: buffer.byteLength,
      }))

      avatarUrl = buildPublicUrl(key)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Avatar upload failed'
      return status(500, { message })
    }

    const updated = await updateUser(user.id, { image: avatarUrl })
    if (!updated) return status(404, { message: 'Not found' })
    return { avatarUrl, user: updated }
  }, {
    auth: true,
    body: t.Object({
      // ~1.4x a 5MB binary cap — base64 inflates size by ~1.33x
      data: t.String({ maxLength: 7 * 1024 * 1024 }),
      mediaType: t.String(),
    }),
    response: {
      200: AvatarUploadResponse,
      404: NotFoundResponse,
      400: MessageResponse,
      500: MessageResponse,
      503: ErrorResponse,
      413: ErrorResponse,
    },
    detail: { tags: ['Users'], summary: 'Upload avatar image' },
  })

  .post('/mcp-token/regenerate', async ({ user, status }) => {
    const updated = await updateUser(user.id, { mcpToken: crypto.randomUUID(), mcpTokenRotatedAt: new Date() })
    if (!updated) return status(404, { message: 'Not found' })
    return {
      mcpToken: updated.mcpToken!,
      mcpTokenRotatedAt: updated.mcpTokenRotatedAt!,
    }
  }, { auth: true, response: { 200: McpTokenRegenerateResponse, 404: NotFoundResponse }, detail: { tags: ['Users'], summary: 'Regenerate MCP token' } })

  .get('/me/export', async ({ user, set, status }) => {
    const data = await exportUser(user.id)
    if (!data) return status(404, { message: 'Not found' })
    set.headers['content-disposition'] = 'attachment; filename="mana-export.json"'
    return data
  }, {
    auth: true,
    detail: { tags: ['Users'], summary: 'Export all user data as JSON' },
  })

  .delete('/me', async ({ user, status }) => {
    await deleteUser(user.id)
    return status(204)
  }, { auth: true, detail: { tags: ['Users'], summary: 'Delete current user account' } })
