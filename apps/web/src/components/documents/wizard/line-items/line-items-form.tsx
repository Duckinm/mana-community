import { useEffect, useState } from 'react'
import { useStore } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, FolderOpen } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { CurrencyCombobox } from '@/components/documents/ui/currency-combobox'
import { FieldInput } from '@/components/documents/ui/field-input'
import { CURRENCIES } from '@/components/documents/ui/currency-combobox'
import { ItemLibraryPopover } from '@/components/documents/wizard/line-items/item-library-popover'
import { ProjectItemsDrawer } from '@/components/documents/wizard/line-items/project-items-drawer'
import { SaveAsTemplateButton } from '@/components/documents/wizard/line-items/save-as-template-button'
import {
  clampDiscountCents,
  discountCentsFromPercent,
  discountPercentFromCents,
} from '@/components/documents/wizard/line-items/discount'
import { WizardProgress } from '@/components/documents/wizard/wizard-progress'
import { documentTypeLabelKey } from '@/components/documents/document-type-labels'
import type { WizardForm } from '@/components/documents/wizard/document-wizard-state'

interface LineItemsFormProps {
  form: WizardForm
  onStepChange: (step: string) => void
}

/** `min`/`max` on a number input only gate the steppers — typed values still need clamping. */
function clamp(value: string, fallback: number, min: number, max: number): number {
  const parsed = parseFloat(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback))
}

function formatAmount(value: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.value === currency)
  const symbol = curr?.symbol ?? '$'
  return `${symbol}${value.toFixed(2)}`
}

export function LineItemsForm({ form, onStepChange }: LineItemsFormProps) {
  const { t } = useTranslation('documents')
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false)
  const [discountAmountInput, setDiscountAmountInput] = useState<string | null>(null)
  const [discountPercentInput, setDiscountPercentInput] = useState<string | null>(null)
  const vatRegistered = useStore(form.store, (s) => s.values.vatRegistered)
  const clientEntityType = useStore(form.store, (s) => s.values.clientEntityType)
  const discountItems = useStore(form.store, (s) => s.values.items)
  const currentDiscountCents = useStore(form.store, (s) => s.values.discountCents)
  const currentSubtotalCents = Math.round(
    discountItems.reduce((sum, item) => sum + (item.qty ?? 1) * (item.amount ?? 0), 0) * 100,
  )

  useEffect(() => {
    if (!vatRegistered) form.setFieldValue('taxRateBps', 0)
  }, [vatRegistered])

  useEffect(() => {
    if (clientEntityType !== 'company') form.setFieldValue('whtRateBps', 0)
  }, [clientEntityType])

  useEffect(() => {
    const nextDiscountCents = clampDiscountCents(currentDiscountCents, currentSubtotalCents)
    if (nextDiscountCents !== currentDiscountCents) {
      form.setFieldValue('discountCents', nextDiscountCents)
    }
  }, [currentDiscountCents, currentSubtotalCents])

  return (
    <form.Subscribe selector={(s) => s.values.type}>
      {(type) => (
    <div>
      <p className="pb-3 text-2xl font-semibold">{t(documentTypeLabelKey(type, 'lineItemsTitle'))}</p>
      <WizardProgress step="3" documentType={type} onStepChange={onStepChange} />

      <CurrencyCombobox form={form} />

      <form.Subscribe
        selector={(s) => ({
          items: s.values.items,
          discountCents: s.values.discountCents,
          taxRateBps: s.values.taxRateBps,
          whtRateBps: s.values.whtRateBps,
          currency: s.values.currency,
          projectId: s.values.projectId,
        })}
      >
        {({ items, discountCents, taxRateBps, whtRateBps, currency, projectId }) => {
          const subtotal = items.reduce((sum, item) => sum + (item.qty ?? 1) * (item.amount ?? 0), 0)
          const subtotalCents = Math.round(subtotal * 100)
          const discount = discountCents / 100
          const taxRate = taxRateBps / 10000
          const tax = (subtotal - discount) * taxRate
          const whtRate = whtRateBps / 10000
          const whtCents = (subtotal - discount) * whtRate
          const total = subtotal - discount + tax - whtCents

          return (
            <>
              <div className="mt-2">
                <div className="flex items-center gap-1 mb-1 pl-0">
                  <div className="flex-1">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{t('lineItemsForm.description')}</span>
                  </div>
                  <div className="w-14 text-center">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{t('lineItemsForm.qty')}</span>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{t('lineItemsForm.price')}</span>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{t('lineItemsForm.total')}</span>
                  </div>
                  <div className="w-5" />
                </div>
                {items.map((item, i) => {
                  const qty = item.qty ?? 1
                  const price = item.amount ?? 0
                  const rowTotal = qty * price
                  return (
                    <div key={i} className="group relative flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (items.length <= 1) return
                          const next = items.filter((_, idx) => idx !== i)
                          form.setFieldValue('items', next)
                        }}
                        disabled={items.length <= 1}
                        className="absolute -left-7 flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 disabled:opacity-0 text-muted-foreground"
                        tabIndex={-1}
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="flex-1">
                        <form.Field name={`items[${i}].itemDescription` as `items[${number}].itemDescription`}>
                          {(field) => (
                            <FieldInput
                              placeholder={t('lineItemsForm.itemDescriptionPlaceholder')}
                              value={field.state.value ?? ''}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                          )}
                        </form.Field>
                      </div>
                      <div className="w-14">
                        <FieldInput
                          type="number"
                          step="1"
                          min="1"
                          placeholder="1"
                          value={qty.toString()}
                          onChange={(e) => {
                            const next = [...items]
                            next[i] = { ...next[i], qty: Math.round(clamp(e.target.value, 1, 1, Number.MAX_SAFE_INTEGER)) }
                            form.setFieldValue('items', next)
                          }}
                          className="text-center"
                        />
                      </div>
                      <div className="w-20">
                        <FieldInput
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={price.toString()}
                          onChange={(e) => {
                            const next = [...items]
                            next[i] = { ...next[i], amount: clamp(e.target.value, 0, 0, Number.MAX_SAFE_INTEGER) }
                            form.setFieldValue('items', next)
                          }}
                          className="text-right"
                        />
                      </div>
                      <div className="w-20 text-right text-xs pb-1 border-b border-dashed border-border-strong h-[42px] flex items-center justify-end text-muted-foreground">
                        {formatAmount(rowTotal, currency)}
                      </div>
                      <SaveAsTemplateButton
                        description={item.itemDescription ?? ''}
                        qty={qty}
                        amount={price}
                        currency={currency}
                      />
                    </div>
                  )
                })}

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      form.setFieldValue('items', [...items, { itemDescription: '', qty: 1, amount: 0 }])
                    }}
                    className="flex items-center gap-1.5 text-sm font-medium transition-colors text-warning"
                  >
                    <Plus size={14} />
                    {t('lineItemsForm.addItem')}
                  </button>

                  <ItemLibraryPopover
                    onInsert={(newItems) => form.setFieldValue('items', [...items, ...newItems])}
                    currency={currency}
                  />

                  {projectId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setProjectDrawerOpen(true)}
                    >
                      <FolderOpen size={12} />
                      {t('lineItemsForm.fromProject')}
                    </Button>
                  )}
                </div>

                {projectId && (
                  <ProjectItemsDrawer
                    projectId={projectId}
                    open={projectDrawerOpen}
                    onClose={() => setProjectDrawerOpen(false)}
                    onInsert={(newItems) => form.setFieldValue('items', [...items, ...newItems])}
                    currency={currency}
                  />
                )}
              </div>

              <div className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="discount-amount" className="text-xs font-medium text-muted-foreground">
                      {t('lineItemsForm.discountAmount')}
                    </label>
                    <FieldInput
                      id="discount-amount"
                      aria-label={t('lineItemsForm.discountAmount')}
                      type="number"
                      min="0"
                      max={(subtotalCents / 100).toString()}
                      step="0.01"
                      placeholder="0.00"
                      value={discountAmountInput ?? (discountCents / 100).toString()}
                      className="text-right"
                      onBlur={() => setDiscountAmountInput(null)}
                      onChange={(e) => {
                        setDiscountAmountInput(e.target.value)
                        setDiscountPercentInput(null)
                        form.setFieldValue(
                          'discountCents',
                          clampDiscountCents(parseFloat(e.target.value || '0') * 100, subtotalCents),
                        )
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="discount-percent" className="text-xs font-medium text-muted-foreground">
                      {t('lineItemsForm.discountPercent')}
                    </label>
                    <FieldInput
                      id="discount-percent"
                      aria-label={t('lineItemsForm.discountPercent')}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0.00"
                      value={discountPercentInput ?? discountPercentFromCents(discountCents, subtotalCents)}
                      className="text-right"
                      onBlur={() => setDiscountPercentInput(null)}
                      onChange={(e) => {
                        setDiscountPercentInput(e.target.value)
                        setDiscountAmountInput(null)
                        form.setFieldValue(
                          'discountCents',
                          discountCentsFromPercent(parseFloat(e.target.value || '0'), subtotalCents),
                        )
                      }}
                    />
                  </div>
                </div>
                <FieldInput
                  label={t('lineItemsForm.taxes')}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  disabled={!vatRegistered}
                  value={vatRegistered ? (taxRateBps / 100).toString() : '0'}
                  onChange={(e) => form.setFieldValue('taxRateBps', Math.round(clamp(e.target.value, 0, 0, 100) * 100))}
                />
                <FieldInput
                  label={t('lineItemsForm.wht')}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  disabled={clientEntityType !== 'company'}
                  value={clientEntityType === 'company' ? (whtRateBps / 100).toString() : '0'}
                  onChange={(e) => form.setFieldValue('whtRateBps', Math.round(clamp(e.target.value, 0, 0, 100) * 100))}
                />
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between py-1.5 text-muted-foreground">
                  <span>{t('lineItemsForm.subtotal')}</span>
                  <span className="font-mono">{formatAmount(subtotal, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between py-1.5 text-muted-foreground">
                    <span>{t('lineItemsForm.discountLabel')}</span>
                    <span className="font-mono text-danger">-{formatAmount(discount, currency)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between py-1.5 text-muted-foreground">
                    <span>{t('lineItemsForm.tax')}</span>
                    <span className="font-mono">{formatAmount(tax, currency)}</span>
                  </div>
                )}
                {whtCents > 0 && (
                  <div className="flex justify-between py-1.5 text-muted-foreground">
                    <span>{t('lineItemsForm.whtWithRate', { rate: (whtRateBps / 100).toFixed(0) })}</span>
                    <span className="font-mono text-danger">-{formatAmount(whtCents, currency)}</span>
                  </div>
                )}
                <div className="sticky bottom-0 flex justify-between py-2 border-t border-dashed border-border-strong font-semibold text-ink bg-surface-page">
                  <span>{t('lineItemsForm.total')}</span>
                  <span className="font-mono">{formatAmount(total, currency)}</span>
                </div>
              </div>
            </>
          )
        }}
      </form.Subscribe>
    </div>
      )}
    </form.Subscribe>
  )
}
