import { describe, expect, it } from 'vitest'
import { wizardFormDefaults } from '@/components/documents/wizard/wizard-defaults'
import { wizardValuesToContactInput, wizardValuesToCreateInput } from '@/components/documents/wizard/wizard-api-bridge'

describe('wizard API bridge', () => {
  it('keeps contact-library toggle out of document payload', () => {
    const values = {
      ...wizardFormDefaults('QO', undefined),
      addToContactLibrary: true,
      clientName: 'Matthew Streich',
    }

    expect(wizardValuesToCreateInput(values)).not.toHaveProperty('addToContactLibrary')
  })

  it('maps free-form client details to a contact input', () => {
    const values = {
      ...wizardFormDefaults('QO', undefined),
      clientName: 'Stracke Inc',
      clientNameTh: 'บริษัท สแตรก จำกัด',
      clientEntityType: 'company' as const,
      clientEmail: 'billing@stracke.test',
      clientPhone: '+66 81 234 5678',
      clientTaxId: '0123456789012',
      clientBranchNumber: '00000',
    }

    expect(wizardValuesToContactInput(values)).toMatchObject({
      name: 'Stracke Inc',
      company: 'Stracke Inc',
      email: 'billing@stracke.test',
      entityType: 'company',
      taxId: '0123456789012',
      branchNumber: '00000',
      companyNameTh: 'บริษัท สแตรก จำกัด',
    })
  })

  it('forwards card wallet payment fields to the document payload', () => {
    const values = {
      ...wizardFormDefaults('INV', undefined),
      cardNumber: '**** 4242',
      cardExpiry: '12/28',
      cardholderName: 'Jane Freelancer',
    }

    expect(wizardValuesToCreateInput(values)).toMatchObject({
      cardNumber: '**** 4242',
      cardExpiry: '12/28',
      cardholderName: 'Jane Freelancer',
    })
  })

  it('preserves comma-separated phone values in document and contact payloads', () => {
    const values = {
      ...wizardFormDefaults('INV', undefined),
      clientName: 'Client',
      yourPhone: '02-123-4567, 081-234-5678',
      clientPhone: '089-111-2222, +66 2 987 6543',
    }

    expect(wizardValuesToCreateInput(values)).toMatchObject({
      yourPhone: '02-123-4567, 081-234-5678',
      clientPhone: '089-111-2222, +66 2 987 6543',
    })
    expect(wizardValuesToContactInput(values)?.phone).toBe('089-111-2222, +66 2 987 6543')
  })
})
