import { describe, expect, it } from 'vitest'
import { wizardFormDefaults } from '@/components/documents/wizard/wizard-defaults'
import { validateStep } from '@/components/documents/wizard/wizard-step-validation'

describe('wizard step validation', () => {
  it('requires a sender in the same shared validation layer as MCP and the API', () => {
    const validity = validateStep('1', wizardFormDefaults('QO', undefined), (key) => key)

    expect(validity).toMatchObject({ field: 'registeredName', message: 'senderRequired' })
  })

  it('returns every missing client field in one pass', () => {
    const validity = validateStep('2', wizardFormDefaults('INV', undefined), (key) => key)

    expect(validity.fields).toEqual(['clientName', 'clientPhone'])
  })
})
