import { db } from '@api/db'
import { activityLogs, contacts } from '@mana/db'
import { eq } from 'drizzle-orm'

export type ActivityAction =
  | 'created' | 'updated' | 'deleted' | 'archived' | 'restored'
  | 'completed' | 'published' | 'sent' | 'emailed' | 'paid' | 'overdue'
  | 'linked' | 'commented'
  | 'logged_in' | 'changed_password' | 'updated_settings'

export interface LogActivityParams {
  userId: string
  entityType: 'contact' | 'project' | 'task' | 'document' | 'transaction' | 'user'
  entityId: string
  action: ActivityAction
  summaryKey: string
  summaryParams?: Record<string, unknown>
  contactId?: string | null
  projectId?: string | null
  metadata?: Record<string, unknown>
}

export function logActivity(params: LogActivityParams): Promise<void> {
  const run = async () => {
    const values = {
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      summaryKey: params.summaryKey,
      summaryParams: params.summaryParams ? JSON.stringify(params.summaryParams) : null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    }

    if (params.contactId) {
      await db.transaction(async (tx) => {
        await tx.insert(activityLogs).values({
          ...values,
          contactId: params.contactId ?? null,
          projectId: params.projectId ?? null,
        })
        await tx
          .update(contacts)
          .set({ lastContactedAt: new Date() })
          .where(eq(contacts.id, params.contactId!))
      })
    } else {
      await db.insert(activityLogs).values({
        ...values,
        contactId: params.contactId ?? null,
        projectId: params.projectId ?? null,
      })
    }
  }

  return run().catch((err) => {
    console.error('[activity]', err)
  })
}

export function logContactCreated(contact: { id: string; name: string }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'contact', entityId: contact.id, contactId: contact.id, action: 'created', summaryKey: 'activity:contact.created', summaryParams: { name: contact.name } })
}

export function logContactUpdated(contact: { id: string; name: string }, userId: string, changedFields: string[], metadata?: Record<string, unknown>): Promise<void> {
  const summaryKey = changedFields.length === 1 ? 'activity:contact.updatedField' : 'activity:contact.updated'
  const summaryParams = changedFields.length === 1
    ? { name: contact.name, field: `activity:fields.${changedFields[0]}` }
    : { name: contact.name }
  return logActivity({ userId, entityType: 'contact', entityId: contact.id, contactId: contact.id, action: 'updated', summaryKey, summaryParams, metadata })
}

export function logContactDeleted(contact: { id: string }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'contact', entityId: contact.id, action: 'deleted', summaryKey: 'activity:contact.deleted' })
}

export function logContactMerged(contact: { id: string; name: string }, userId: string, mergedId: string, mergedName?: string): Promise<void> {
  return logActivity({ userId, entityType: 'contact', entityId: contact.id, contactId: contact.id, action: 'linked', summaryKey: 'activity:contact.merged', summaryParams: { name: contact.name, mergedName: mergedName ?? mergedId }, metadata: { mergedContactId: mergedId, mergedContactName: mergedName } })
}

export function logDocumentCreated(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'created', summaryKey: 'activity:document.created', summaryParams: { type: doc.type, number: doc.number }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null })
}

export function logDocumentPublished(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'published', summaryKey: 'activity:document.published', summaryParams: { type: doc.type, number: doc.number }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null })
}

export function logDocumentEmailed(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null; clientEmail?: string | null }, userId: string): Promise<void> {
  const summaryKey = doc.clientEmail ? 'activity:document.emailedTo' : 'activity:document.emailed'
  const summaryParams = doc.clientEmail
    ? { type: doc.type, number: doc.number, email: doc.clientEmail }
    : { type: doc.type, number: doc.number }
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'emailed', summaryKey, summaryParams, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null })
}

export function logDocumentPaid(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null }, userId: string, transactionId: string): Promise<void> {
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'paid', summaryKey: 'activity:document.paid', summaryParams: { type: doc.type, number: doc.number }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null, metadata: { transactionId } })
}

export function logDocumentUnreconciled(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null }, userId: string, transactionId: string): Promise<void> {
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'updated', summaryKey: 'activity:document.unreconciled', summaryParams: { type: doc.type, number: doc.number }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null, metadata: { transactionId } })
}

export function logDocumentGenerated(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null; templateNumber: string }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'created', summaryKey: 'activity:document.generated', summaryParams: { type: doc.type, number: doc.number, templateNumber: doc.templateNumber }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null })
}

export function logDocumentPatched(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null }, userId: string, changedKeys: string[], action: ActivityAction = 'updated', metadata?: Record<string, unknown>): Promise<void> {
  const label = `${doc.type} ${doc.number}`
  const summaryKey = changedKeys.length === 1 ? 'activity:document.patchedField' : 'activity:document.patched'
  const summaryParams = changedKeys.length === 1
    ? { label, field: `activity:fields.${changedKeys[0]}` }
    : { label }
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action, summaryKey, summaryParams, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null, metadata })
}

export function logDocumentOverdue(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'overdue', summaryKey: 'activity:document.overdue', summaryParams: { label: `${doc.type} ${doc.number}` }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null })
}

export function logDocumentLinkedToPayment(doc: { id: string; type: string; number: string; contactId?: string | null; projectId?: string | null }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'document', entityId: doc.id, action: 'paid', summaryKey: 'activity:document.linkedToPayment', summaryParams: { label: `${doc.type} ${doc.number}` }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null })
}

export function logTransactionCreated(tx: { id: string; type: string; description: string; amount: number }, userId: string, context?: { projectId?: string | null; contactId?: string | null }): Promise<void> {
  return logActivity({ userId, entityType: 'transaction', entityId: tx.id, action: 'created', summaryKey: 'activity:transaction.created', summaryParams: { type: tx.type, description: tx.description, amount: tx.amount }, projectId: context?.projectId ?? null, contactId: context?.contactId ?? null })
}

export function logTransactionUpdated(tx: { id: string; description: string }, userId: string, _changedKeys: string[], context?: { projectId?: string | null; contactId?: string | null }, metadata?: Record<string, unknown>): Promise<void> {
  return logActivity({ userId, entityType: 'transaction', entityId: tx.id, action: 'updated', summaryKey: 'activity:transaction.updated', summaryParams: { description: tx.description }, projectId: context?.projectId ?? null, contactId: context?.contactId ?? null, metadata })
}

export function logTransactionDeleted(tx: { id: string; description: string }, userId: string, context?: { projectId?: string | null; contactId?: string | null }): Promise<void> {
  return logActivity({ userId, entityType: 'transaction', entityId: tx.id, action: 'deleted', summaryKey: 'activity:transaction.deleted', summaryParams: { description: tx.description }, projectId: context?.projectId ?? null, contactId: context?.contactId ?? null })
}

export function logTransactionPaid(tx: { id: string; description: string }, userId: string, context?: { projectId?: string | null; contactId?: string | null }): Promise<void> {
  return logActivity({ userId, entityType: 'transaction', entityId: tx.id, action: 'paid', summaryKey: 'activity:transaction.paid', summaryParams: { description: tx.description }, projectId: context?.projectId ?? null, contactId: context?.contactId ?? null })
}

export function logProjectCreated(project: { id: string; name: string; contactId?: string | null }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'project', entityId: project.id, action: 'created', summaryKey: 'activity:project.created', summaryParams: { name: project.name }, contactId: project.contactId ?? null })
}

export function logProjectUpdated(project: { id: string; name: string }, userId: string, changedKeys: string[]): Promise<void> {
  const summaryKey = changedKeys.length === 1 ? 'activity:project.updatedField' : 'activity:project.updated'
  const summaryParams = changedKeys.length === 1
    ? { name: project.name, field: `activity:fields.${changedKeys[0]}` }
    : { name: project.name }
  return logActivity({ userId, entityType: 'project', entityId: project.id, action: 'updated', summaryKey, summaryParams })
}

export function logProjectArchived(project: { id: string; name: string; contactId?: string | null }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'project', entityId: project.id, action: 'archived', summaryKey: 'activity:project.archived', summaryParams: { name: project.name }, projectId: project.id, contactId: project.contactId ?? null })
}

export function logProjectRestored(project: { id: string; name: string; contactId?: string | null }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'project', entityId: project.id, action: 'restored', summaryKey: 'activity:project.restored', summaryParams: { name: project.name }, projectId: project.id, contactId: project.contactId ?? null })
}

export function logTaskCreated(task: { id: string; title: string; projectId: string }, userId: string, context?: { projectId?: string | null; contactId?: string | null }): Promise<void> {
  return logActivity({ userId, entityType: 'task', entityId: task.id, action: 'created', summaryKey: 'activity:task.created', summaryParams: { title: task.title }, projectId: context?.projectId ?? task.projectId, contactId: context?.contactId ?? null })
}

export function logTaskDeleted(task: { id: string; title: string; projectId: string }, userId: string, context?: { projectId?: string | null; contactId?: string | null }): Promise<void> {
  return logActivity({ userId, entityType: 'task', entityId: task.id, action: 'deleted', summaryKey: 'activity:task.deleted', summaryParams: { title: task.title }, projectId: context?.projectId ?? task.projectId, contactId: context?.contactId ?? null })
}

export function logTaskCompleted(task: { id: string; title: string; projectId: string }, userId: string, context?: { projectId?: string | null; contactId?: string | null }): Promise<void> {
  return logActivity({ userId, entityType: 'task', entityId: task.id, action: 'completed', summaryKey: 'activity:task.completed', summaryParams: { title: task.title }, projectId: context?.projectId ?? task.projectId, contactId: context?.contactId ?? null })
}

export function logTaskOverdue(task: { id: string; title: string }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'task', entityId: task.id, action: 'overdue', summaryKey: 'activity:task.overdue', summaryParams: { title: task.title } })
}

export function logTasksBulkCompleted(taskIds: string[], userId: string): Promise<void[]> {
  return Promise.all(taskIds.map((id) => logActivity({ userId, entityType: 'task', entityId: id, action: 'completed', summaryKey: 'activity:task.bulkCompleted' })))
}

export function logFileUploaded(file: { id: string; name: string }, userId: string, context?: { contactId?: string | null; projectId?: string | null; entityType?: string | null; entityId?: string | null }): Promise<void> {
  const isContact = context?.entityType === 'contact' && context.entityId
  const isProject = context?.entityType === 'project' && context.entityId
  if (isContact) {
    return logActivity({ userId, entityType: 'contact', entityId: context.entityId!, contactId: context.entityId, action: 'created', summaryKey: 'activity:file.uploaded', summaryParams: { name: file.name }, metadata: { fileId: file.id, fileName: file.name } })
  }
  if (isProject) {
    return logActivity({ userId, entityType: 'project', entityId: context.entityId!, action: 'created', summaryKey: 'activity:file.uploaded', summaryParams: { name: file.name }, projectId: context.projectId ?? null, contactId: context.contactId ?? null, metadata: { fileId: file.id, fileName: file.name } })
  }
  return logActivity({ userId, entityType: 'contact', entityId: file.id, action: 'created', summaryKey: 'activity:file.uploaded', summaryParams: { name: file.name }, metadata: { fileId: file.id, fileName: file.name } })
}

export function logFileMoved(file: { id: string; name: string }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'contact', entityId: file.id, action: 'updated', summaryKey: 'activity:file.moved', summaryParams: { name: file.name } })
}

export function logFileDeleted(file: { id: string; name: string }, userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'contact', entityId: file.id, action: 'deleted', summaryKey: 'activity:file.deleted', summaryParams: { name: file.name } })
}

export function logFileSavedViaAI(file: { id: string; name: string }, userId: string, contactId?: string | null): Promise<void> {
  return logActivity({ userId, entityType: 'contact', entityId: file.id, action: 'created', summaryKey: 'activity:file.savedViaAI', summaryParams: { name: file.name }, contactId: contactId ?? null })
}

export function logUserSignedIn(userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'user', entityId: userId, action: 'logged_in', summaryKey: 'activity:user.signedIn' })
}

export function logUserChangedPassword(userId: string): Promise<void> {
  return logActivity({ userId, entityType: 'user', entityId: userId, action: 'changed_password', summaryKey: 'activity:user.changedPassword' })
}

export function logUserUpdatedSettings(userId: string, changedFields: string[]): Promise<void> {
  return logActivity({ userId, entityType: 'user', entityId: userId, action: 'updated_settings', summaryKey: 'activity:user.updatedSettings', metadata: { fields: changedFields } })
}
