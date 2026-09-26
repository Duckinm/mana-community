import type { Contact } from '@/components/contacts/types'
import type { WizardForm } from '@/components/documents/wizard/document-wizard-state'

export function clearClientDetails(form: WizardForm): void {
  form.setFieldValue('contactId', null)
  form.setFieldValue('addToContactLibrary', false)
  form.setFieldValue('clientEntityType', 'individual')
  form.setFieldValue('clientVatRegistered', false)
  form.setFieldValue('clientName', null)
  form.setFieldValue('clientEmail', null)
  form.setFieldValue('clientPhone', null)
  form.setFieldValue('clientNameTh', null)
  form.setFieldValue('clientAddress', null)
  form.setFieldValue('clientAddressTh', null)
  form.setFieldValue('clientTaxId', null)
  form.setFieldValue('clientBranchNumber', null)
  form.setFieldValue('clientZip', null)
  form.setFieldValue('clientCountry', null)
}

/** Fills the whole client step from a contact's business/tax record. */
export function applyContactToForm(form: WizardForm, contact: Contact): void {
  form.setFieldValue('contactId', contact.id)
  form.setFieldValue('addToContactLibrary', false)
  form.setFieldValue('clientName', contact.companyNameEn ?? contact.name ?? null)
  form.setFieldValue('clientEmail', contact.email ?? null)
  form.setFieldValue('clientPhone', contact.phone ?? null)
  form.setFieldValue('clientEntityType', (contact.entityType ?? 'individual') as 'individual' | 'company')
  form.setFieldValue('clientVatRegistered', false)
  form.setFieldValue('clientNameTh', contact.companyNameTh ?? contact.nameTh ?? null)
  form.setFieldValue('clientAddress', contact.address ?? null)
  form.setFieldValue('clientAddressTh', contact.addressTh ?? null)
  form.setFieldValue('clientTaxId', contact.taxId ?? contact.nationalId ?? null)
  form.setFieldValue('clientBranchNumber', contact.branchNumber ?? null)
  form.setFieldValue('clientZip', contact.zip ?? null)
  form.setFieldValue('clientCountry', contact.country ?? null)
}
