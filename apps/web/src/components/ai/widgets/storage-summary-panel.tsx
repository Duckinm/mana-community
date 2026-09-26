import { useTranslation } from 'react-i18next'
import { HardDrive } from '@/components/icons'
import { Link } from '@tanstack/react-router'
import { AiWidgetShell, FullPageLink } from '@/components/ai/widgets/widget-shell'
import { formatBytes } from '@/lib/format-bytes'
import { STORAGE_QUOTA_BYTES } from '@/lib/storage-quota'

export type StorageSummaryData = {
  totalFiles: number
  totalFolders: number
  totalSizeMb: number
  byKind?: Record<string, number>
}

export function StorageSummaryAiPanel({ summary }: { summary: StorageSummaryData }) {
  const { t } = useTranslation('chat')
  const usedBytes = summary.totalSizeMb * 1024 * 1024
  const percent = Math.min((usedBytes / STORAGE_QUOTA_BYTES) * 100, 100)
  const barColor = percent >= 90 ? 'bg-danger' : percent >= 70 ? 'bg-warning' : 'bg-primary/40'

  return (
    <AiWidgetShell
      icon={<HardDrive size={12} />}
      label={t('widget.storageSummary')}
      fullPageAction={
        <Link to="/storage" search={{ sort: 'name-asc' }}>
          <FullPageLink>{t('overlay.openFull')}</FullPageLink>
        </Link>
      }
    >
      <div className="space-y-2">
        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-slow ${barColor}`}
            style={{ width: `${Math.max(percent, 0.5)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-2xs text-caption">
          <span>{formatBytes(usedBytes)}</span>
          <span>{formatBytes(STORAGE_QUOTA_BYTES)}</span>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-2xs text-caption">{t('widget.files')}</span>
            <p className="font-medium text-foreground">{summary.totalFiles}</p>
          </div>
          <div>
            <span className="text-2xs text-caption">{t('widget.folders')}</span>
            <p className="font-medium text-foreground">{summary.totalFolders}</p>
          </div>
        </div>
      </div>
    </AiWidgetShell>
  )
}
