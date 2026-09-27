import { ArrowRight, Check } from '@/components/icons'
import { STEP_ICONS, STEP_KEYS, TOTAL_STEPS, navigateToStep, useGetStarted, type StepKey } from '@/components/onboarding/get-started-steps'
import { WorkspaceHomeSkeleton } from '@/components/onboarding/workspace-home-skeleton'
import { Button } from '@/components/ui/button'
import { QueryErrorPanel } from '@/components/ui/query-error-panel'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

const destinations = { contact: 'contacts', project: 'projects', document: 'documents', transaction: 'transactions' } as const

export function WorkspaceHome() {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()
  const { isPending, isError, refetch, done, completed } = useGetStarted(true)
  const next = STEP_KEYS.find(key => !done[key])

  function openStep(key: StepKey) {
    if (done[key] && key === 'document') void navigate({ to: '/documents' })
    else if (done[key] && key === 'transaction') void navigate({ to: '/accounting/transactions', search: { q: '', type: 'all', status: 'all', txId: undefined, walletId: undefined, from: undefined, to: undefined } })
    else navigateToStep(navigate, key)
  }

  return (
    <div className="page-scroll flex-1 overflow-y-auto px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-8 pb-24 xl:pb-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('home.title')}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t('home.intro')}</p>
        </header>
        {isPending ? <WorkspaceHomeSkeleton /> : isError ? (
          <QueryErrorPanel onRetry={() => void refetch()} />
        ) : (
          <section aria-labelledby="workspace-steps" className="space-y-5">
            <div className="space-y-2">
              <h2 id="workspace-steps" className="text-lg font-semibold text-foreground">{t(next ? 'home.start' : 'home.ready')}</h2>
              {next && <p className="text-sm text-muted-foreground">{t('home.progress', { completed, total: TOTAL_STEPS })}</p>}
              <Button variant="solid" onClick={() => next ? navigateToStep(navigate, next) : void navigate({ to: '/projects' })} className="mt-2 h-auto min-h-10 max-w-full whitespace-normal text-left">
                {next ? t('home.next', { step: t(`getStarted.steps.${next}.title`) }) : t('home.openProjects')}
                <ArrowRight size={16} className="shrink-0" aria-hidden />
              </Button>
            </div>
            <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              {STEP_KEYS.map(key => {
                const Icon = STEP_ICONS[key]
                return (
                  <li key={key}>
                    <button type="button" onClick={() => openStep(key)} className="flex w-full items-center gap-3 rounded-lg px-4 py-4 text-left transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary">
                      <Icon size={20} className="shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{t(done[key] ? `home.${destinations[key]}` : `getStarted.steps.${key}.title`)}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{t(`getStarted.steps.${key}.description`)}</span>
                      </span>
                      {done[key] ? <Check size={18} className="shrink-0 text-success" aria-label={t('home.completed')} /> : <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        <section className="space-y-2 border-t border-border-subtle pt-5">
          <h2 className="text-sm font-semibold text-foreground">{t('home.optional')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('home.optionalDescription')}</p>
          <Link to="/settings/integrations" className="inline-block text-sm text-primary underline underline-offset-4">{t('home.configure')}</Link>
        </section>
        <p className="text-sm text-muted-foreground">{t('home.free')}</p>
      </div>
    </div>
  )
}
