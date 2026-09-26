import type { WizardFormValues } from '@/components/documents/wizard/document-wizard-state'
import type { DocumentType } from '@/components/documents/types'
import { getWizardSteps, hasPaymentStep } from '@/components/documents/wizard/wizard-step-config'
import {
  isValidCardExpiry,
  isValidCardNumber,
  isValidPromptPayId,
  isValidSwiftBic,
} from '@/lib/payment-destination-schema'
import { validateDocumentCreate, type DocumentCreateValidationIssue } from '@mana/db/document-create-validation'

export interface StepValidity {
  valid: boolean
  message?: string
  /** Field name to focus when this step fails validation on submit. */
  field?: keyof WizardFormValues
  fields?: (keyof WizardFormValues)[]
}

function hasValue(value: string | null | undefined): boolean {
  return !!value?.trim()
}

function documentCreationIssues(values: WizardFormValues): DocumentCreateValidationIssue[] {
  return validateDocumentCreate({
    type: values.type,
    senderProfileId: values.senderProfileId,
    registeredName: values.registeredName,
    clientName: values.clientName,
    clientPhone: values.clientPhone,
    projectId: values.projectId,
    issueDate: values.issueDate,
    dueDate: values.dueDate,
    discountCents: values.discountCents,
    taxRateBps: values.taxRateBps,
    whtRateBps: values.whtRateBps,
    isRecurring: values.isRecurring,
    recurringInterval: values.recurringInterval,
    items: values.items.map((item) => ({
      description: item.itemDescription,
      quantity: item.qty,
      unitPriceCents: Math.round((item.amount ?? 0) * 100),
    })),
  })
}

function validateSenderStep(values: WizardFormValues, t: TFn): StepValidity {
  if (!documentCreationIssues(values).includes('sender-required')) return { valid: true }
  return { valid: false, message: t('senderRequired'), field: 'registeredName', fields: ['registeredName'] }
}

function validateClientStep(values: WizardFormValues, t: TFn): StepValidity {
  const issues = documentCreationIssues(values)
  const errors: { field: keyof WizardFormValues; message: string }[] = []
  if (issues.includes('client-name-required')) {
    errors.push({ field: 'clientName', message: t('clientNameRequired') })
  }
  if (issues.includes('client-phone-required')) {
    errors.push({ field: 'clientPhone', message: t('clientPhoneRequired') })
  }
  if (errors.length === 0) return { valid: true }

  const first = errors[0]!
  return {
    valid: false,
    message: first.message,
    field: first.field,
    fields: errors.map((error) => error.field),
  }
}

function validateLineItemsStep(values: WizardFormValues, t: TFn): StepValidity {
  const issues = documentCreationIssues(values)
  if (issues.includes('item-required')) {
    return { valid: false, message: t('addOneItem') }
  }
  if (issues.includes('item-quantity-required')) {
    return { valid: false, message: t('allItemsNeedQty') }
  }
  if (issues.includes('item-quantity-fractional')) {
    return { valid: false, message: t('itemQuantityFractional') }
  }
  if (issues.includes('item-amount-required')) {
    return { valid: false, message: t('itemNeedsAmount') }
  }
  if (issues.includes('item-amount-negative')) {
    return { valid: false, message: t('itemAmountNegative') }
  }
  if (issues.includes('discount-negative')) {
    return { valid: false, message: t('discountNegative') }
  }
  if (issues.includes('rate-out-of-range')) {
    return { valid: false, message: t('rateOutOfRange') }
  }
  return { valid: true }
}

/**
 * Payment fields on the wizard are flat and populated from a selected wallet
 * template. Only validate the fields the chosen destination actually uses so a
 * "no payment details" selection stays valid.
 */
function validatePaymentStep(values: WizardFormValues, t: TFn): StepValidity {
  if (hasValue(values.swiftCode) && !isValidSwiftBic(values.swiftCode!)) {
    return { valid: false, message: t('invalidSwift') }
  }
  if (hasValue(values.promptPayId) && !isValidPromptPayId(values.promptPayId!)) {
    return { valid: false, message: t('invalidPromptPay') }
  }
  if (hasValue(values.cardNumber) && !isValidCardNumber(values.cardNumber!)) {
    return { valid: false, message: t('invalidCardNumber') }
  }
  if (hasValue(values.cardExpiry) && !isValidCardExpiry(values.cardExpiry!)) {
    return { valid: false, message: t('invalidExpiry') }
  }
  return { valid: true }
}

function validateTermsStep(values: WizardFormValues, t: TFn): StepValidity {
  const issues = documentCreationIssues(values)
  if (issues.includes('project-required')) {
    return { valid: false, message: t('selectProject') }
  }
  if (issues.includes('recurring-interval-required')) {
    return { valid: false, message: t('selectRepeatInterval') }
  }
  if (issues.includes('due-before-issue')) {
    return { valid: false, message: t('dueBeforeIssue') }
  }
  return { valid: true }
}

type TFn = (key: string) => string

export function validateStep(
  step: string,
  values: WizardFormValues,
  t: TFn,
): StepValidity {
  switch (step) {
    case '1':
      return validateSenderStep(values, t)
    case '2':
      return validateClientStep(values, t)
    case '3':
      return validateLineItemsStep(values, t)
    case '4':
      return validatePaymentStep(values, t)
    case '5':
      return validateTermsStep(values, t)
    default:
      return { valid: true }
  }
}

/** Validity of every step for the given document type, keyed by step id. */
export function computeStepValidity(
  values: WizardFormValues,
  documentType: DocumentType,
  t: TFn,
): Record<string, StepValidity> {
  const steps = getWizardSteps(documentType)
  const result: Record<string, StepValidity> = {}
  for (const step of steps) {
    if (step === '4' && !hasPaymentStep(documentType)) continue
    result[step] = validateStep(step, values, t)
  }
  return result
}
