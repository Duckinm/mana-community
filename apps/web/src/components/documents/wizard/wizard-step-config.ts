import type { DocumentType } from '@/components/documents/types'

export const PAYMENT_STEP = '4'
export const ALL_WIZARD_STEPS = ['1', '2', '3', '4', '5', '6'] as const

export function hasPaymentStep(type: DocumentType): boolean {
  return type === 'INV'
}

export function getWizardSteps(type: DocumentType): string[] {
  if (hasPaymentStep(type)) return [...ALL_WIZARD_STEPS]
  return ALL_WIZARD_STEPS.filter((step) => step !== PAYMENT_STEP)
}
