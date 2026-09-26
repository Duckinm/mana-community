import type { Document } from '@/components/documents/types'
import { addCalendarDays, todayCalendarDate } from '@/lib/calendar-date'
import { fromQuantity } from '@/lib/quantity'
import type { WizardForm, WizardFormValues, WizardItem, SenderProfile } from './wizard-schema'
import type { DocumentType } from './wizard-schema'

export function computeDefaultDates(dueDaysOffset = 30): { issueDate: string; dueDate: string | null } {
  const issueDate = todayCalendarDate()
  return {
    issueDate,
    dueDate: addCalendarDays(issueDate, dueDaysOffset),
  }
}

/** Per-type default from the sender profile; null means the type carries no due date. */
export function profileDueDays(profile: SenderProfile, documentType: DocumentType): number | null {
  if (documentType === 'QO') return profile.defaultDueDaysQo ?? null
  if (documentType === 'RC') return profile.defaultDueDaysRc ?? null
  return profile.defaultDueDaysOffset
}

function defaultDueDateForType(documentType: DocumentType): string | null {
  if (documentType === 'QO') return null
  return computeDefaultDates(30).dueDate
}

export function applyProfileToForm(form: WizardForm, profile: SenderProfile): void {
  form.setFieldValue('registeredName', profile.registeredName)
  form.setFieldValue('registeredNameEn', profile.registeredNameEn)
  form.setFieldValue('yourEmail', profile.yourEmail)
  form.setFieldValue('yourPhone', profile.yourPhone)
  form.setFieldValue('registeredAddress', profile.registeredAddress)
  form.setFieldValue('registeredAddressEn', profile.registeredAddressEn)
  form.setFieldValue('yourBranchNumber', profile.yourBranchNumber)
  form.setFieldValue('yourCountry', profile.yourCountry)
  form.setFieldValue('yourZip', profile.yourZip)
  form.setFieldValue('yourTaxId', profile.yourTaxId)
  form.setFieldValue('yourLogo', profile.yourLogo)
  // E-signature is shelved for now — carry the image but never enable it.
  form.setFieldValue('signatureImage', profile.signatureImage)
  form.setFieldValue('signaturePlacement', profile.signaturePlacement)
  form.setFieldValue('vatRegistered', profile.vatRegistered)
  form.setFieldValue('documentLanguage', profile.documentLanguage as 'th' | 'en')
  // Not VAT-registered means no right to charge VAT — force the rate to 0, same as business-panel.tsx.
  form.setFieldValue('taxRateBps', profile.vatRegistered ? (profile.defaultTaxRateBps ?? 700) : 0)
  form.setFieldValue('senderProfileId', profile.id)
  form.setFieldValue('remark', profile.defaultRemark ?? null)
  const docType = form.getFieldValue('type')
  const dueDays = profileDueDays(profile, docType)
  const currentIssueDate = form.getFieldValue('issueDate') ?? todayCalendarDate()
  form.setFieldValue('dueDate', dueDays === null ? null : addCalendarDays(currentIssueDate, dueDays))
}

export function defaultWizardItems(initialData?: Document): WizardItem[] {
  return (
    initialData?.items?.map((item) => ({
      itemDescription: item.description,
      qty: fromQuantity(item.quantity),
      amount: item.unitPriceCents / 100,
    })) ?? [{ itemDescription: '', qty: 1, amount: 0 }]
  )
}

export function wizardFormDefaults(
  documentType: DocumentType,
  initialData: Document | undefined,
  defaultProjectId?: string | null,
): WizardFormValues {
  const defaultItems = defaultWizardItems(initialData)
  const defaultIssueDate = computeDefaultDates(30).issueDate
  const defaultDueDate = defaultDueDateForType(documentType)
  return {
    step: '1',
    type: documentType,
    currency: initialData?.currency ?? 'THB',
    projectId: initialData?.projectId ?? defaultProjectId ?? null,
    contactId: initialData?.contactId ?? null,
    addToContactLibrary: false,
    issueDate: initialData?.issueDate || defaultIssueDate,
    dueDate: initialData ? initialData.dueDate : defaultDueDate,
    // Seeded on edit so the default-profile effect in your-details-form doesn't
    // overwrite a saved document's own details (and its e-Tax opt-in).
    senderProfileId: initialData?.senderProfileId ?? null,
    remarkTemplateId: null,
    paymentTemplateId: null,
    discountCents: initialData?.discountCents ?? 0,
    taxRateBps: initialData?.taxRateBps ?? 0,
    whtRateBps: initialData?.whtRateBps ?? 0,
    remark: initialData?.remark ?? null,
    items: defaultItems,
    documentLanguage: initialData?.documentLanguage ?? 'th',
    vatRegistered: initialData?.vatRegistered ?? false,
    useRegisteredAddressForPayment: false,
    registeredName: initialData?.registeredName ?? null,
    registeredNameEn: initialData?.registeredNameEn ?? null,
    yourEmail: initialData?.yourEmail ?? null,
    yourPhone: initialData?.yourPhone ?? null,
    registeredAddress: initialData?.registeredAddress ?? null,
    registeredAddressEn: initialData?.registeredAddressEn ?? null,
    yourBranchNumber: initialData?.yourBranchNumber ?? null,
    yourCountry: initialData?.yourCountry ?? null,
    yourZip: initialData?.yourZip ?? null,
    yourTaxId: initialData?.yourTaxId ?? null,
    yourLogo: initialData?.yourLogo ?? null,
    signatureImage: initialData?.signatureImage ?? null,
    signatureEnabled: initialData?.signatureEnabled ?? false,
    signaturePlacement: initialData?.signaturePlacement ?? null,
    clientEntityType:
      initialData?.clientNameTh || initialData?.clientBranchNumber
        ? ('company' as const)
        : ('individual' as const),
    clientVatRegistered: !!initialData?.clientBranchNumber,
    clientName: initialData?.clientName ?? null,
    clientNameTh: initialData?.clientNameTh ?? null,
    clientEmail: initialData?.clientEmail ?? null,
    clientPhone: initialData?.clientPhone ?? null,
    clientAddress: initialData?.clientAddress ?? null,
    clientAddressTh: initialData?.clientAddressTh ?? null,
    clientBranchNumber: initialData?.clientBranchNumber ?? null,
    clientCountry: initialData?.clientCountry ?? null,
    clientZip: initialData?.clientZip ?? null,
    clientTaxId: initialData?.clientTaxId ?? null,
    bankName: initialData?.bankName ?? null,
    accountNumber: initialData?.accountNumber ?? null,
    accountName: initialData?.accountName ?? null,
    swiftCode: initialData?.swiftCode ?? null,
    promptPayId: initialData?.promptPayId ?? null,
    cardNumber: initialData?.cardNumber ?? null,
    cardExpiry: initialData?.cardExpiry ?? null,
    cardholderName: initialData?.cardholderName ?? null,
    isRecurring: initialData?.isRecurring ?? false,
    recurringInterval: initialData?.recurringInterval ?? null,
  }
}
