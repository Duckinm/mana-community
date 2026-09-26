import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

type Props = {
  linkCode: string
  addFriendUrl: string | null
  sendCodeUrl: string | null
  expiresAt: string | null
  onNewCode: () => void
  isPending: boolean
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary-border bg-primary-soft text-2xs font-medium text-primary">
      {n}
    </span>
  )
}

export function LineConnectSteps({ linkCode, addFriendUrl, sendCodeUrl, expiresAt, onNewCode, isPending }: Props) {
  const { t } = useTranslation('settings')
  const [copied, setCopied] = useState(false)

  const minutesLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000))
    : null

  async function copyCode() {
    await navigator.clipboard.writeText(linkCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border-t border-border-subtle px-4 py-4">
      <ol className="space-y-4">
        <li className="flex gap-3">
          <StepNumber n={1} />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-foreground">{t('integrations.line.step1')}</p>
            {addFriendUrl ? (
              <a
                href={addFriendUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-8 items-center rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground"
              >
                {t('integrations.line.step1Action')}
              </a>
            ) : null}
          </div>
        </li>

        <li className="flex gap-3">
          <StepNumber n={2} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground">{t('integrations.line.step2')}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyCode()}
                title={t('integrations.line.copyCode')}
                className="flex min-h-9 items-center gap-2 rounded-lg border border-border-default bg-surface-raised px-3 font-mono text-base tracking-[0.3em] text-foreground transition-colors duration-base hover:border-border-strong"
              >
                {linkCode}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                )}
              </button>

              {sendCodeUrl ? (
                <a
                  href={sendCodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-9 items-center rounded-lg border border-primary-border bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition-colors duration-base hover:bg-primary-hover hover:text-primary-foreground"
                >
                  {t('integrations.line.openLineSend')}
                </a>
              ) : null}
            </div>

            {sendCodeUrl ? (
              <div className="mt-3 hidden items-center gap-3 sm:flex">
                {/* QR needs a light quiet zone to stay scannable in dark theme */}
                <div className="shrink-0 rounded-lg bg-white p-2">
                  <QRCodeSVG value={sendCodeUrl} size={88} />
                </div>
                <p className="text-caption">{t('integrations.line.scanHint')}</p>
              </div>
            ) : null}
          </div>
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
        <p className="text-caption">
          {minutesLeft !== null
            ? t('integrations.line.waitingWithExpiry', { minutes: minutesLeft })
            : t('integrations.line.waiting')}
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={onNewCode}
          className="text-xs text-muted-foreground underline-offset-4 transition-colors duration-base hover:text-foreground hover:underline disabled:opacity-60"
        >
          {t('integrations.line.newCode')}
        </button>
      </div>
    </div>
  )
}
