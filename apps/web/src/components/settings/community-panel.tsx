import { useTranslation } from 'react-i18next'

export function CommunityPanel() {
  const { t } = useTranslation('settings')
  return (
    <div className="surface-card space-y-3 rounded-xl p-4 text-sm">
      <p className="text-muted-foreground">{t('community.description')}</p>
      <a href="https://github.com/Duckinm/mana-community" className="block text-primary hover:underline" target="_blank" rel="noreferrer">{t('community.source')}</a>
      <a href="https://github.com/Duckinm/mana-community/issues" className="block text-primary hover:underline" target="_blank" rel="noreferrer">{t('community.feedback')}</a>
    </div>
  )
}
