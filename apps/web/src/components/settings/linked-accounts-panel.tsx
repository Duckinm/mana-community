import { CapabilityNotice } from '@/components/capability-notice'
import { useCapabilities } from '@/hooks/use-capabilities'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Badge, StatusDot } from '@/components/ui/badge'
import {
  AuthDiscordIcon,
  AuthFacebookIcon,
  AuthGoogleIcon,
} from '@/components/auth/auth-provider-icons'
import { useLinkedAccounts, type LinkedProvider } from '@/hooks/use-linked-accounts'

const PROVIDERS: { id: LinkedProvider; icon: () => React.JSX.Element }[] = [
  { id: 'google', icon: AuthGoogleIcon },
  { id: 'discord', icon: AuthDiscordIcon },
  { id: 'facebook', icon: AuthFacebookIcon },
]

export function LinkedAccountsPanel() {
  const { t } = useTranslation('settings')
  const capabilities = useCapabilities()
  const socialProviders = capabilities.data?.socialProviders
  const { accounts, isLoading, connect, disconnect, isPending } = useLinkedAccounts()

  async function handleConnect(provider: LinkedProvider) {
    if (capabilities.isError || !socialProviders?.[provider]) return
    try {
      await connect(provider)
    } catch {
      toast.error(t('linkedAccounts.connectFailed'))
    }
  }

  async function handleDisconnect(provider: LinkedProvider) {
    try {
      await disconnect(provider)
      toast.success(t('linkedAccounts.disconnected'))
    } catch (error) {
      const code = (error as { code?: string })?.code
      const key =
        code === 'FAILED_TO_UNLINK_LAST_ACCOUNT'
          ? 'linkedAccounts.cantUnlinkLast'
          : 'linkedAccounts.disconnectFailed'
      toast.error(t(key))
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <p className="text-sm font-semibold text-foreground mb-1">{t('linkedAccounts.title')}</p>
      <p className="text-xs text-muted-foreground mb-4">{t('linkedAccounts.description')}</p>

      <CapabilityNotice available={socialProviders ? PROVIDERS.every(({ id }) => socialProviders[id]) : undefined} unavailableKey="socialUnavailable" />
      <div className="space-y-2">
        {PROVIDERS.map(({ id, icon: Icon }) => {
          const connected = accounts.some((account) => account.providerId === id)
          return (
            <div
              key={id}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 border border-border-default bg-surface-card hover:border-border-strong transition-colors duration-base sm:gap-4"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-surface-raised border border-border-subtle">
                <Icon />
              </div>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {t(`linkedAccounts.providers.${id}`)}
              </p>
              {connected ? (
                <div className="flex shrink-0 items-center gap-2">
                  {/* the Disconnect button already reads as "connected" — the badge
                      is the first thing to drop when the row runs out of width */}
                  <Badge variant="success" size="pill" className="gap-1.5 max-sm:hidden">
                    <StatusDot status="active" />
                    {t('linkedAccounts.connected')}
                  </Badge>
                  <button
                    type="button"
                    disabled={isPending || isLoading}
                    onClick={() => void handleDisconnect(id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border-subtle text-muted-foreground hover:text-foreground hover:border-border-default transition-colors duration-base disabled:opacity-60"
                  >
                    {t('linkedAccounts.disconnect')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending || isLoading || capabilities.isError || !socialProviders?.[id]}
                  onClick={() => void handleConnect(id)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary-soft border border-primary-border text-primary font-medium hover:bg-primary-hover hover:text-primary-foreground transition-colors duration-base disabled:opacity-60"
                >
                  {t('linkedAccounts.connect')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
