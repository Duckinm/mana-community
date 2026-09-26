import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { YourDetailsForm } from '@/components/documents/wizard/your-details/your-details-form'
import { ClientDetailsForm } from '@/components/documents/wizard/client-details/client-details-form'
import { LineItemsForm } from '@/components/documents/wizard/line-items/line-items-form'
import { PaymentDetailsForm } from '@/components/documents/wizard/payment-details/payment-details-form'
import { DocumentTermsForm } from '@/components/documents/wizard/document-terms/document-terms-form'
import { hasPaymentStep } from '@/components/documents/wizard/wizard-step-config'
import { WizardProgress } from '@/components/documents/wizard/wizard-progress'
import type { WizardForm } from '@/components/documents/wizard/document-wizard-state'

interface UserInputFormProps {
  form: WizardForm
  documentNumber?: string
  publishNumber?: string
  onSaveDraft: () => void
  onPublish: () => void
  isSubmitting: boolean
  onStepChange: (step: string) => void
}

export function UserInputForm({ form, documentNumber, publishNumber, onSaveDraft, onPublish, isSubmitting, onStepChange }: UserInputFormProps) {
  const { t } = useTranslation('documents')
  return (
    <form.Subscribe selector={(state) => ({ step: state.values.step, type: state.values.type })}>
      {({ step, type }) => (
        <div>
          <div className={step === '1' ? 'block' : 'hidden'}>
            <YourDetailsForm form={form} onStepChange={onStepChange} />
          </div>
          <div className={step === '2' ? 'block' : 'hidden'}>
            <ClientDetailsForm form={form} onStepChange={onStepChange} />
          </div>
          <div className={step === '3' ? 'block' : 'hidden'}>
            <LineItemsForm form={form} onStepChange={onStepChange} />
          </div>
          {hasPaymentStep(type) && (
            <div className={step === '4' ? 'block' : 'hidden'}>
              <PaymentDetailsForm form={form} onStepChange={onStepChange} />
            </div>
          )}
          <div className={step === '5' ? 'block' : 'hidden'}>
            <DocumentTermsForm form={form} documentNumber={documentNumber} onStepChange={onStepChange} />
          </div>
          {step === '6' && (
            <div>
              <p className="pb-3 text-2xl font-semibold">{t('userInputForm.reviewSaveTitle')}</p>
              <WizardProgress step={step} documentType={type} onStepChange={onStepChange} />
              <p className="text-sm mb-8 text-muted-foreground">
                {t('userInputForm.reviewSaveDescription')}
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onSaveDraft}
                  disabled={isSubmitting}
                  className="w-full rounded-xl"
                >
                  {t('userInputForm.saveDraft')}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={onPublish}
                  disabled={isSubmitting}
                  className="w-full rounded-xl"
                >
                  {isSubmitting
                    ? t('userInputForm.publishing')
                    : publishNumber
                      ? t('userInputForm.publishNumber', { number: publishNumber })
                      : t('userInputForm.publishDocument')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </form.Subscribe>
  )
}
