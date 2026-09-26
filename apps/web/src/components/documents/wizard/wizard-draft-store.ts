import type { WizardFormValues } from '@/components/documents/wizard/document-wizard-state'
import type { DocumentType } from '@/components/documents/types'

/** ponytail: module-level cache, cleared by full page reload; that is the intended "persist until hard refresh" behavior. */
const drafts = new Map<string, WizardFormValues>()

export function wizardDraftKey(documentType: DocumentType, documentId?: string): string {
  return `${documentType}:${documentId ?? 'new'}`
}

export function getWizardDraft(key: string): WizardFormValues | undefined {
  return drafts.get(key)
}

export function setWizardDraft(key: string, values: WizardFormValues): void {
  drafts.set(key, values)
}

export function clearWizardDraft(key: string): void {
  drafts.delete(key)
}
