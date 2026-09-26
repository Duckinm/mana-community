import type { WizardForm } from '@/components/documents/wizard/document-wizard-state'
import { useEffect } from 'react'

/** Warns on hard refresh / tab close while the wizard has unsaved changes. In-app navigation never blocks; see wizard-draft-store. */
export function useWizardDirtyGuard(form: WizardForm) {
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!form.state.isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [form])
}
