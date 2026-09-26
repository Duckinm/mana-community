import { db } from '@api/db'
import { projects } from '@mana/db'
import { and, eq } from 'drizzle-orm'
import type { ActivityAction } from '@api/lib/activity'

const CONTACT_FIELD_KEYS = new Set([
  'name', 'role', 'company', 'email', 'phone', 'website', 'color', 'tags', 'notes',
  'relationshipLevel', 'metVia', 'imageUrl', 'stage', 'dealValue', 'dealStatus', 'entityType',
  'nameTh', 'addressTh', 'taxId', 'branchNumber', 'zip', 'country', 'address',
  'nationalId', 'companyNameEn', 'companyNameTh',
])

export interface ContactPatchActivity {
  action: ActivityAction
  summaryKey: string
  summaryParams?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function contactIdForProject(
  userId: string,
  projectId: string | null | undefined,
): Promise<string | null> {
  if (!projectId) return null
  const [row] = await db
    .select({ contactId: projects.contactId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
  return row?.contactId ?? null
}

export async function activityScopeForProject(
  userId: string,
  projectId: string | null | undefined,
): Promise<{ contactId: string | null; projectId: string | null }> {
  if (!projectId) return { contactId: null, projectId: null }
  const contactId = await contactIdForProject(userId, projectId)
  return { contactId, projectId }
}

function summarizeSingleField(
  key: string,
  value: unknown,
  contactName: string,
): ContactPatchActivity | null {
  if (key === 'relationshipLevel' && typeof value === 'number') {
    return {
      action: 'updated',
      summaryKey: 'activity:contact.relationshipSet',
      summaryParams: { level: `activity:relationshipLevel.${value}`, name: contactName },
      metadata: { field: key, to: value },
    }
  }
  if (key === 'notes') {
    return {
      action: 'updated',
      summaryKey: 'activity:contact.notesUpdated',
      summaryParams: { name: contactName },
      metadata: { field: key },
    }
  }
  if (key === 'tags') {
    return {
      action: 'updated',
      summaryKey: 'activity:contact.tagsUpdated',
      summaryParams: { name: contactName },
      metadata: { field: key, to: value },
    }
  }
  if (key === 'imageUrl') {
    return {
      action: 'updated',
      summaryKey: value ? 'activity:contact.photoAdded' : 'activity:contact.photoRemoved',
      summaryParams: { name: contactName },
      metadata: { field: key },
    }
  }
  if (key === 'name' && typeof value === 'string') {
    return {
      action: 'updated',
      summaryKey: 'activity:contact.nameChanged',
      summaryParams: { value },
      metadata: { field: key, to: value },
    }
  }
  if (!CONTACT_FIELD_KEYS.has(key)) return null
  return {
    action: 'updated',
    summaryKey: 'activity:contact.fieldUpdated',
    summaryParams: { field: `activity:fields.${key}`, name: contactName },
    metadata: { field: key, to: value },
  }
}

export function buildContactPatchActivity(
  patch: Record<string, unknown>,
  contactName: string,
): ContactPatchActivity | null {
  const changedKeys = Object.keys(patch).filter((k) => k !== 'updatedAt' && k !== 'initials')
  if (changedKeys.length === 0) return null

  if (changedKeys.length === 1) {
    return summarizeSingleField(changedKeys[0], patch[changedKeys[0]], contactName)
  }

  const singles = changedKeys
    .map((key) => summarizeSingleField(key, patch[key], contactName))
    .filter((entry): entry is ContactPatchActivity => entry !== null)

  if (singles.length === 1) return singles[0]

  return {
    action: 'updated',
    summaryKey: 'activity:contact.fieldsUpdated',
    summaryParams: { fields: changedKeys.map((k) => `activity:fields.${k}`), name: contactName },
    metadata: {
      changed: changedKeys,
      to: Object.fromEntries(changedKeys.map((k) => [k, patch[k]])),
    },
  }
}

export interface PatchActivity {
  action: ActivityAction
  summaryKey: string
  summaryParams?: Record<string, unknown>
  metadata: Record<string, unknown>
}

/**
 * Generic "patch -> activity" builder for entities whose activity log mostly
 * cares about (a) a status field flipping to specific values, each with its
 * own action/key, and (b) a fallback "updated" key with from/to metadata otherwise.
 */
export function buildPatchActivity(
  changedKeys: string[],
  patch: Record<string, unknown>,
  existing: Record<string, unknown>,
  options: {
    statusActions?: Partial<Record<string, { action: ActivityAction; summaryKey: string; summaryParams?: Record<string, unknown> }>>
    fallbackSummaryKey: (changedKeys: string[]) => { summaryKey: string; summaryParams?: Record<string, unknown> }
  },
): PatchActivity | null {
  if (changedKeys.length === 0) return null

  const metadata = {
    changed: changedKeys,
    from: Object.fromEntries(changedKeys.map((k) => [k, existing[k]])),
    to: Object.fromEntries(changedKeys.map((k) => [k, patch[k]])),
  }

  if (changedKeys.includes('status') && typeof patch.status === 'string') {
    const override = options.statusActions?.[patch.status]
    if (override) {
      return { action: override.action, summaryKey: override.summaryKey, summaryParams: override.summaryParams, metadata }
    }
  }

  const fallback = options.fallbackSummaryKey(changedKeys)
  return { action: 'updated', summaryKey: fallback.summaryKey, summaryParams: fallback.summaryParams, metadata }
}
