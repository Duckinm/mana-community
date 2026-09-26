import { describe, expect, it } from 'vitest'
import { wizardFormDefaults } from '@/components/documents/wizard/wizard-defaults'
import {
  clearWizardDraft,
  getWizardDraft,
  setWizardDraft,
  wizardDraftKey,
} from '@/components/documents/wizard/wizard-draft-store'

describe('wizard draft store', () => {
  it('separates drafts by document type and id', () => {
    const newQuoteKey = wizardDraftKey('QO')
    const editInvoiceKey = wizardDraftKey('INV', 'doc-123')
    expect(newQuoteKey).not.toBe(editInvoiceKey)
    expect(getWizardDraft(newQuoteKey)).toBeUndefined()
  })

  it('round-trips values through set/get and forgets them on clear', () => {
    const key = wizardDraftKey('QO', 'doc-456')
    const values = { ...wizardFormDefaults('QO', undefined), clientName: 'Draft Client' }

    setWizardDraft(key, values)
    expect(getWizardDraft(key)).toMatchObject({ clientName: 'Draft Client' })

    clearWizardDraft(key)
    expect(getWizardDraft(key)).toBeUndefined()
  })
})
