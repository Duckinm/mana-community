import { useEffect } from 'react'
import { useStore } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useWallets } from '@/hooks/use-wallets'
import type { Wallet } from '@/components/finance/types'
import type { WizardForm } from '@/components/documents/wizard/document-wizard-state'
import { WizardProgress } from '@/components/documents/wizard/wizard-progress'

interface PaymentDetailsFormProps {
  form: WizardForm
  onStepChange: (step: string) => void
}

function TemplateReadonlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-dashed border-border-subtle last:border-0">
      <span className="text-caption text-xs">{label}</span>
      <span className="text-sm text-foreground">
        {value || <span className="text-muted-foreground italic">—</span>}
      </span>
    </div>
  )
}

function applyWalletToForm(
  form: WizardForm,
  wallet: Wallet,
) {
  form.setFieldValue('paymentTemplateId', wallet.id)
  form.setFieldValue('bankName', wallet.bankName)
  form.setFieldValue('accountNumber', wallet.accountNumber)
  form.setFieldValue('accountName', wallet.accountName)
  form.setFieldValue('swiftCode', wallet.swiftCode)
  form.setFieldValue('promptPayId', wallet.promptPayId)
  form.setFieldValue('cardNumber', wallet.cardNumber)
  form.setFieldValue('cardExpiry', wallet.cardExpiry)
  form.setFieldValue('cardholderName', wallet.cardholderName)
}

export function PaymentDetailsForm({ form, onStepChange }: PaymentDetailsFormProps) {
  const { t } = useTranslation('documents')
  const documentType = useStore(form.store, (s) => s.values.type)
  const { wallets, isLoading } = useWallets()
  const paymentTemplates = wallets.filter((w) => w.showOnInvoice)
  const defaultTemplate = paymentTemplates.find((w) => w.isDefaultInvoice) ?? paymentTemplates[0] ?? null

  useEffect(() => {
    if (defaultTemplate) {
      applyWalletToForm(form, defaultTemplate)
    }
  }, [defaultTemplate, form])

  function clearPaymentFields() {
    form.setFieldValue('paymentTemplateId', null)
    form.setFieldValue('bankName', null)
    form.setFieldValue('accountNumber', null)
    form.setFieldValue('accountName', null)
    form.setFieldValue('swiftCode', null)
    form.setFieldValue('promptPayId', null)
    form.setFieldValue('cardNumber', null)
    form.setFieldValue('cardExpiry', null)
    form.setFieldValue('cardholderName', null)
  }

  function handleTemplateSelect(id: string) {
    if (id === '__none__') { clearPaymentFields(); return }
    const wallet = paymentTemplates.find((w) => w.id === id)
    if (wallet) applyWalletToForm(form, wallet)
  }

  return (
    <div>
      <p className="pb-3 text-2xl font-semibold">{t('paymentDetailsForm.title')}</p>
      <WizardProgress step="4" documentType={documentType} onStepChange={onStepChange} />

      {isLoading ? (
        <div className="space-y-2 mb-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : paymentTemplates.length === 0 ? (
        <div className="mb-4 rounded-xl border border-dashed border-border-strong bg-surface-raised p-4">
          <p className="text-sm text-muted-foreground">
            {t('paymentDetailsForm.noPaymentTemplatesYet')}{' '}
            <Link
              to="/accounting/transactions"
              search={{ q: "", type: "all", status: "all" }}
              className="text-primary underline underline-offset-2 hover:opacity-80 duration-fast"
            >
              {t('paymentDetailsForm.setOneUpIn')}
            </Link>
            .
          </p>
          <p className="text-xs text-caption mt-2">{t('paymentDetailsForm.skipStepHint')}</p>

          <form.Subscribe selector={(s) => ({
            useRegisteredAddressForPayment: s.values.useRegisteredAddressForPayment,
            registeredAddress: s.values.registeredAddress,
          })}>
            {({ useRegisteredAddressForPayment, registeredAddress }) => (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useRegisteredAddressForPayment}
                    onChange={(e) => form.setFieldValue('useRegisteredAddressForPayment', e.target.checked)}
                    className="h-4 w-4 rounded border-border-default accent-primary"
                  />
                  <span className="text-sm text-foreground">{t('paymentDetailsForm.useRegisteredAddress')}</span>
                </label>
                {useRegisteredAddressForPayment && registeredAddress && (
                  <div className="rounded-lg bg-surface-card border border-border-subtle px-3 py-2">
                    <p className="text-xs text-caption mb-0.5">{t('paymentDetailsForm.paymentAddress')}</p>
                    <p className="text-sm text-foreground">{registeredAddress}</p>
                  </div>
                )}
                {useRegisteredAddressForPayment && !registeredAddress && (
                  <p className="text-xs text-caption italic">{t('paymentDetailsForm.noRegisteredAddressSet')}</p>
                )}
              </div>
            )}
          </form.Subscribe>
        </div>
      ) : (
        <form.Subscribe selector={(s) => s.values.paymentTemplateId}>
          {(paymentTemplateId) => (
            <div className="mb-4">
              <Select
                value={paymentTemplateId ?? '__none__'}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('paymentDetailsForm.selectPaymentTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">{t('paymentDetailsForm.noPaymentDetails')}</span>
                  </SelectItem>
                  {paymentTemplates.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name}{wallet.isDefaultInvoice ? ` ${t('paymentDetailsForm.default')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link
                to="/accounting/transactions"
                search={{ q: "", type: "all", status: "all" }}
                className="inline-block mt-1.5 text-xs text-caption hover:text-muted-foreground duration-fast"
              >
                {t('paymentDetailsForm.managePaymentTemplates')}
              </Link>
            </div>
          )}
        </form.Subscribe>
      )}

      <form.Subscribe selector={(s) => s.values.paymentTemplateId}>
        {(paymentTemplateId) => {
          const wallet = paymentTemplates.find((w) => w.id === paymentTemplateId)
          if (!wallet) return null
          return (
            <form.Subscribe
              selector={(s) => ({
                bankName: s.values.bankName,
                accountNumber: s.values.accountNumber,
                accountName: s.values.accountName,
                swiftCode: s.values.swiftCode,
                promptPayId: s.values.promptPayId,
                cardNumber: s.values.cardNumber,
                cardExpiry: s.values.cardExpiry,
                cardholderName: s.values.cardholderName,
              })}
            >
              {(vals) => (
                <div className="rounded-xl border border-border-subtle bg-surface-raised p-4 mb-4 space-y-0">
                  {wallet.type === 'bank_transfer' && (
                    <>
                      <TemplateReadonlyField label={t('paymentDetailsForm.bankName')} value={vals.bankName} />
                      <TemplateReadonlyField label={t('paymentDetailsForm.accountNumber')} value={vals.accountNumber} />
                      <TemplateReadonlyField label={t('paymentDetailsForm.accountName')} value={vals.accountName} />
                      <TemplateReadonlyField label={t('paymentDetailsForm.swiftBic')} value={vals.swiftCode} />
                    </>
                  )}
                  {wallet.type === 'promptpay' && (
                    <TemplateReadonlyField label={t('paymentDetailsForm.promptPay')} value={vals.promptPayId} />
                  )}
                  {wallet.type === 'card' && (
                    <>
                      <TemplateReadonlyField label={t('paymentDetailsForm.cardNumber')} value={vals.cardNumber} />
                      <TemplateReadonlyField label={t('paymentDetailsForm.cardExpiry')} value={vals.cardExpiry} />
                      <TemplateReadonlyField label={t('paymentDetailsForm.cardholderName')} value={vals.cardholderName} />
                    </>
                  )}
                </div>
              )}
            </form.Subscribe>
          )
        }}
      </form.Subscribe>
    </div>
  )
}
