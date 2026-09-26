import i18next from '@/lib/i18n'
import { toast } from 'sonner'

export function initOfflineListener(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('offline', () => {
    toast.error(i18next.t('offline', { ns: 'common' }), {
      description: i18next.t('offlineDescription', { ns: 'common' }),
    })
  })

  window.addEventListener('online', () => {
    toast.success(i18next.t('online', { ns: 'common' }))
  })
}
