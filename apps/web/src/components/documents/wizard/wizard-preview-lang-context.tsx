import { createContext, useContext } from 'react'

export const WizardPreviewLangContext = createContext<'th' | 'en'>('th')

export function usePreviewLang() {
  return useContext(WizardPreviewLangContext)
}
