import type { CreateDocumentInput } from '@/components/documents/types'
import type { ContactCreateInput } from '@/components/contacts/types'
import type { WizardFormValues } from './wizard-schema'
import { hasPaymentStep } from './wizard-step-config'
import { toQuantity } from '@/lib/quantity'

export function wizardValuesToCreateInput(values: WizardFormValues): CreateDocumentInput {
  const filledItems = values.items.filter((item) => item.itemDescription.trim())
  const apiItems = filledItems.map((item, i) => ({
    description: item.itemDescription.trim(),
    quantity: toQuantity(item.qty ?? 1),
    unitPriceCents: Math.round((item.amount ?? 0) * 100),
    position: i,
  }))
  const { clientEntityType: _entityType, clientVatRegistered: _vat, addToContactLibrary: _addToContactLibrary, ...rest } = values
  const includePayment = hasPaymentStep(rest.type)
  return {
    type: rest.type,
    senderProfileId: rest.senderProfileId ?? undefined,
    currency: rest.currency,
    projectId: rest.projectId,
    contactId: rest.contactId,
    issueDate: rest.issueDate,
    dueDate: rest.dueDate,
    discountCents: rest.discountCents,
    taxRateBps: rest.taxRateBps,
    whtRateBps: rest.whtRateBps,
    remark: rest.remark?.trim() || null,
    items: apiItems,
    documentLanguage: rest.documentLanguage,
    vatRegistered: rest.vatRegistered,
    registeredName: rest.registeredName,
    registeredNameEn: rest.registeredNameEn,
    yourEmail: rest.yourEmail,
    yourPhone: rest.yourPhone,
    registeredAddress: rest.registeredAddress,
    registeredAddressEn: rest.registeredAddressEn,
    yourBranchNumber: rest.yourBranchNumber,
    yourCountry: rest.yourCountry,
    yourZip: rest.yourZip,
    yourTaxId: rest.yourTaxId,
    // yourLogo/signature image + placement inherited server-side from senderProfileId.
    signatureEnabled: rest.type === 'INV' ? rest.signatureEnabled : false,
    clientName: rest.clientName,
    clientNameTh: rest.clientNameTh,
    clientEmail: rest.clientEmail,
    clientPhone: rest.clientPhone,
    clientAddress: rest.clientAddress,
    clientAddressTh: rest.clientAddressTh,
    clientBranchNumber: rest.clientBranchNumber,
    clientCountry: rest.clientCountry,
    clientZip: rest.clientZip,
    clientTaxId: rest.clientTaxId,
    bankName: includePayment ? rest.bankName : null,
    accountNumber: includePayment ? rest.accountNumber : null,
    accountName: includePayment ? rest.accountName : null,
    swiftCode: includePayment ? rest.swiftCode : null,
    promptPayId: includePayment ? rest.promptPayId : null,
    cardNumber: includePayment ? rest.cardNumber : null,
    cardExpiry: includePayment ? rest.cardExpiry : null,
    cardholderName: includePayment ? rest.cardholderName : null,
    isRecurring: rest.isRecurring,
    recurringInterval: rest.recurringInterval,
  }
}

function generateInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export function wizardValuesToContactInput(values: WizardFormValues): ContactCreateInput | null {
  const name = (values.clientName ?? values.clientNameTh ?? '').trim()
  if (!name) return null
  const companyName = values.clientEntityType === 'company' ? name : ''
  return {
    name,
    initials: generateInitials(name),
    role: '',
    company: companyName,
    email: values.clientEmail?.trim() ?? '',
    website: '',
    color: '#D4A843',
    tags: [],
    relationshipLevel: 1,
    metVia: 'Document',
    phone: values.clientPhone?.trim() || undefined,
    entityType: values.clientEntityType,
    nameTh: values.clientEntityType === 'individual' ? values.clientNameTh : null,
    addressTh: values.clientAddressTh,
    taxId: values.clientEntityType === 'company' ? values.clientTaxId : null,
    branchNumber: values.clientEntityType === 'company' ? values.clientBranchNumber : null,
    zip: values.clientZip,
    country: values.clientCountry,
    address: values.clientAddress,
    nationalId: values.clientEntityType === 'individual' ? values.clientTaxId : null,
    companyNameEn: values.clientEntityType === 'company' ? values.clientName : null,
    companyNameTh: values.clientEntityType === 'company' ? values.clientNameTh : null,
  }
}
