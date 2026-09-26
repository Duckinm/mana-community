import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Row } from '@/components/settings/shared'
import { client } from '@/lib/eden'
import { signOutAndSync } from '@/lib/session-sync'
import { cn } from '@/lib/utils'

export function PrivacyPanel() {
  const { t } = useTranslation('settings')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const result = await client.api.users.me.export.get()
      if (result.error) throw result.error
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mana-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 4000)
      return
    }
    setDeleting(true)
    try {
      await client.api.users.me.delete()
      await signOutAndSync()
      window.location.href = '/login'
    } catch {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      <Row label={t('privacy.exportAllData')}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? t('privacy.exporting') : t('privacy.exportAllData')}
        </Button>
      </Row>

      <div>
        <p className="text-sm font-medium text-foreground mb-1">{t('privacy.deleteAccount')}</p>
        <p className="text-xs text-muted-foreground mb-3">
          {t('privacy.deleteAccountDescription')}
        </p>
        <Button
          type="button"
          variant="destructive-soft"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className={cn(deleteConfirm && 'border-destructive/50 bg-destructive/20')}
        >
          {deleting ? t('privacy.deleting') : deleteConfirm ? t('privacy.confirmDelete') : t('privacy.deleteAccount')}
        </Button>
        {deleteConfirm && (
          <p className="text-xs text-destructive mt-2">{t('privacy.deleteWarning')}</p>
        )}
      </div>
    </div>
  )
}
