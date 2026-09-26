import { createContext, useContext } from 'react'
import type { WizardFormValues } from '@/components/documents/wizard/document-wizard-state'

export const WizardValuesContext = createContext<WizardFormValues | null>(null)

export function useWizardValues(): WizardFormValues {
  const ctx = useContext(WizardValuesContext)
  if (!ctx) throw new Error('useWizardValues must be used within WizardValuesContext.Provider')
  return ctx
}
