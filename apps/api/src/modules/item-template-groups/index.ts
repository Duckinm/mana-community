import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { db } from '@api/db'
import { itemTemplateGroups, itemTemplateGroupMembers } from '@mana/db'
import { eq, and, asc, max } from 'drizzle-orm'
import { itemTemplateGroupToWire } from '@api/modules/item-templates/wire'
import { ItemTemplateGroupsListResponse, ItemTemplateGroupResponse, NotFoundResponse } from '@api/modules/item-templates/responses'
import { CreateItemTemplateGroupBody, UpdateItemTemplateGroupBody } from '@api/lib/db-schema'
import { NoContentResponse } from '@api/lib/wire-schema'
import { listOwnedItemTemplateGroupMembers, requireOwnedItemTemplateIds } from '@api/modules/item-template-groups/service'

export const itemTemplateGroupsModule = new Elysia({ name: 'item-template-groups', prefix: '/api/item-template-groups' })
  .use(betterAuthPlugin)

  .get('/', async ({ user }) => {
    const groups = await db.select().from(itemTemplateGroups)
      .where(eq(itemTemplateGroups.userId, user.id))
      .orderBy(asc(itemTemplateGroups.position), asc(itemTemplateGroups.createdAt))

    if (groups.length === 0) return []

    const members = await listOwnedItemTemplateGroupMembers(user.id, groups.map((group) => group.id))

    return groups.map((group) =>
      itemTemplateGroupToWire(group, {
        templates: members
          .filter((m) => m.groupId === group.id)
          .map(({ groupId: _groupId, ...template }) => template),
      }),
    )
  }, {
    auth: true,
    response: { 200: ItemTemplateGroupsListResponse },
    detail: { tags: ['ItemTemplateGroups'], summary: 'List item template groups with templates' },
  })

  .post('/', async ({ user, status, body }) => {
    const templateIds = await requireOwnedItemTemplateIds(user.id, body.templateIds ?? [])
    const [maxRow] = await db
      .select({ maxPos: max(itemTemplateGroups.position) })
      .from(itemTemplateGroups)
      .where(eq(itemTemplateGroups.userId, user.id))
    const nextPos = (maxRow?.maxPos ?? -1) + 1

    const [created] = await db.insert(itemTemplateGroups).values({
      userId: user.id,
      name: body.name,
      description: body.description ?? '',
      color: body.color ?? 'amber',
      icon: body.icon ?? null,
      position: nextPos,
    }).returning()

    if (templateIds.length > 0) {
      await db.insert(itemTemplateGroupMembers).values(
        templateIds.map((templateId, i) => ({
          groupId: created.id,
          templateId,
          position: i,
        }))
      )
    }

    return status(201, itemTemplateGroupToWire(created, { templates: [] }))
  }, {
    auth: true,
    body: CreateItemTemplateGroupBody,
    response: { 201: ItemTemplateGroupResponse, 400: NotFoundResponse },
    detail: { tags: ['ItemTemplateGroups'], summary: 'Create item template group' },
  })

  .patch('/:id', async ({ user, status, params, body }) => {
    const [updated] = await db.update(itemTemplateGroups)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(itemTemplateGroups.id, params.id), eq(itemTemplateGroups.userId, user.id)))
      .returning()
    if (!updated) return status(404, { message: 'Not found' })
    return itemTemplateGroupToWire(updated, { templates: [] })
  }, {
    auth: true,
    body: UpdateItemTemplateGroupBody,
    response: { 200: ItemTemplateGroupResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplateGroups'], summary: 'Update item template group' },
  })

  .delete('/:id', async ({ user, status, params }) => {
    const [deleted] = await db.delete(itemTemplateGroups)
      .where(and(eq(itemTemplateGroups.id, params.id), eq(itemTemplateGroups.userId, user.id)))
      .returning({ id: itemTemplateGroups.id })
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, {
    auth: true,
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplateGroups'], summary: 'Delete item template group' },
  })

  .post('/:id/members', async ({ user, status, params, body }) => {
    const [group] = await db.select({ id: itemTemplateGroups.id })
      .from(itemTemplateGroups)
      .where(and(eq(itemTemplateGroups.id, params.id), eq(itemTemplateGroups.userId, user.id)))
    if (!group) return status(404, { message: 'Not found' })

    const templateIds = await requireOwnedItemTemplateIds(user.id, body.templateIds)
    if (templateIds.length === 0) return status(204, undefined)

    const [maxRow] = await db
      .select({ maxPos: max(itemTemplateGroupMembers.position) })
      .from(itemTemplateGroupMembers)
      .where(eq(itemTemplateGroupMembers.groupId, params.id))
    const startPos = (maxRow?.maxPos ?? -1) + 1

    await db.insert(itemTemplateGroupMembers)
      .values(templateIds.map((templateId, i) => ({
        groupId: params.id,
        templateId,
        position: startPos + i,
      })))
      .onConflictDoNothing()

    return status(204, undefined)
  }, {
    auth: true,
    body: t.Object({
      templateIds: t.Array(t.String()),
    }),
    response: { 204: NoContentResponse, 400: NotFoundResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplateGroups'], summary: 'Add templates to group' },
  })

  .delete('/:id/members/:templateId', async ({ user, status, params }) => {
    const [group] = await db.select({ id: itemTemplateGroups.id })
      .from(itemTemplateGroups)
      .where(and(eq(itemTemplateGroups.id, params.id), eq(itemTemplateGroups.userId, user.id)))
    if (!group) return status(404, { message: 'Not found' })

    await db.delete(itemTemplateGroupMembers)
      .where(and(
        eq(itemTemplateGroupMembers.groupId, params.id),
        eq(itemTemplateGroupMembers.templateId, params.templateId),
      ))

    return status(204, undefined)
  }, {
    auth: true,
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplateGroups'], summary: 'Remove template from group' },
  })
