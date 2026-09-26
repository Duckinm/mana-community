import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FieldInput } from '@/components/documents/ui/field-input'
import { NewContactModal } from '@/components/contacts/new-contact-modal'
import { useContacts } from '@/context/contacts'
import type { WizardForm } from '@/components/documents/wizard/document-wizard-state'
import { applyContactToForm, clearClientDetails } from '@/components/documents/wizard/client-details/client-prefill'
import { WizardProgress } from '@/components/documents/wizard/wizard-progress'
import { fieldError } from '@/lib/utils'
import { useStore } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'

interface ClientDetailsFormProps {
  form: WizardForm
  onStepChange: (step: string) => void
}

export function ClientDetailsForm({ form, onStepChange }: ClientDetailsFormProps) {
  const { contacts, newContactOpen, setNewContactOpen } = useContacts()
  const { t } = useTranslation('documents')
  const documentType = useStore(form.store, (s) => s.values.type)

  function handleContactSelect(id: string) {
    if (id === '__none__') {
      clearClientDetails(form)
      return
    }
    const contact = contacts.find((c) => c.id === id)
    if (contact) applyContactToForm(form, contact)
  }

  return (
    <div>
      <form.Subscribe selector={(s) => s.values.clientEntityType}>
        {(entityType) => (
          <div className="flex items-center justify-between pb-3">
            <p className="text-2xl font-semibold">{t('wizardForm.clientDetailsTitle')}</p>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  form.setFieldValue('clientEntityType', 'individual')
                  form.setFieldValue('whtRateBps', 0)
                }}
                className={`transition-colors duration-fast ${
                  entityType === 'individual'
                    ? 'text-foreground font-medium'
                    : 'text-caption hover:text-muted-foreground'
                }`}
              >
                {t('wizardForm.individual')}
              </button>
              <span className="text-border-strong">·</span>
              <button
                type="button"
                onClick={() => {
                  form.setFieldValue('clientEntityType', 'company')
                  form.setFieldValue('whtRateBps', 300)
                }}
                className={`transition-colors duration-fast ${
                  entityType === 'company'
                    ? 'text-foreground font-medium'
                    : 'text-caption hover:text-muted-foreground'
                }`}
              >
                {t('wizardForm.company')}
              </button>
            </div>
          </div>
        )}
      </form.Subscribe>
      <WizardProgress step="2" documentType={documentType} onStepChange={onStepChange} />

      <form.Subscribe selector={(s) => s.values.contactId}>
        {(contactId) => (
          <div className="mb-4">
            <Select value={contactId ?? '__none__'} onValueChange={handleContactSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('wizardForm.fillFromContacts')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('wizardForm.fillFromContacts')}</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setNewContactOpen(true)}
              className="inline-block mt-1.5 text-caption hover:text-muted-foreground duration-fast text-xs"
            >
              {t('wizardForm.newContact')}
            </button>
          </div>
        )}
      </form.Subscribe>

      <NewContactModal
        open={newContactOpen}
        onOpenChange={setNewContactOpen}
        onCreated={(contact) => applyContactToForm(form, contact)}
      />

      <form.Subscribe selector={(s) => ({ contactId: s.values.contactId, addToContactLibrary: s.values.addToContactLibrary })}>
        {({ contactId, addToContactLibrary }) => (
          <div className="mb-4 flex items-center justify-between h-[52px] border-b border-dashed border-border-strong">
            <Label className="text-sm font-medium normal-case tracking-normal text-foreground cursor-pointer" htmlFor="add-to-contact-library">
              {t('wizardForm.addToContactLibrary')}
            </Label>
            <Switch
              id="add-to-contact-library"
              checked={!contactId && addToContactLibrary}
              disabled={!!contactId}
              onCheckedChange={(checked) => form.setFieldValue('addToContactLibrary', checked)}
              size="sm"
            />
          </div>
        )}
      </form.Subscribe>

      <form.Subscribe selector={(s) => ({ entityType: s.values.clientEntityType, clientVatRegistered: s.values.clientVatRegistered })}>
        {({ entityType, clientVatRegistered }) => (
          <>
            <form.Field name="clientName">
              {(field) => (
                <>
                  <FieldInput
                    id="clientName"
                    label={entityType === 'company' ? t('wizardForm.companyNameEn') : t('wizardForm.fullName')}
                    placeholder={entityType === 'company' ? t('wizardForm.companyNamePlaceholder') : t('wizardForm.fullNamePlaceholder')}
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.isTouched && fieldError(field.state.meta.errors) && (
                    <p className="mt-1.5 mb-1 text-xs text-danger">{fieldError(field.state.meta.errors)}</p>
                  )}
                </>
              )}
            </form.Field>

            {entityType === 'company' && (
              <form.Field name="clientNameTh">
                {(field) => (
                  <FieldInput
                    label={t('wizardForm.companyNameTh')}
                    placeholder={t('wizardForm.companyNameThPlaceholder')}
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            <form.Field name="clientEmail">
              {(field) => (
                <FieldInput
                  label={t('wizardForm.email')}
                  type="email"
                  placeholder="billing@acme.com"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field name="clientPhone">
              {(field) => (
                <>
                  <FieldInput
                    id="clientPhone"
                    label={t('wizardForm.phone')}
                    type="tel"
                    placeholder="+66 81 234 5678"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.isTouched && fieldError(field.state.meta.errors) && (
                    <p className="mt-1.5 mb-1 text-xs text-danger">{fieldError(field.state.meta.errors)}</p>
                  )}
                </>
              )}
            </form.Field>

            <form.Field name="clientAddress">
              {(field) => (
                <FieldInput
                  label={t('wizardForm.address')}
                  placeholder="456 Corp Ave"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            {entityType === 'company' && (
              <form.Field name="clientAddressTh">
                {(field) => (
                  <FieldInput
                    label={clientVatRegistered ? t('wizardForm.registeredAddress') : t('wizardForm.addressTh')}
                    placeholder="456 ถนนสีลม แขวงสีลม เขตบางรัก"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            {entityType === 'individual' && (
              <form.Field name="clientTaxId">
                {(field) => (
                  <FieldInput
                    label={t('wizardForm.nationalId')}
                    placeholder="1-2345-67890-12-3"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            {entityType === 'company' && (
              <div className="flex items-center justify-between h-[52px] border-b border-dashed border-border-strong mb-0">
                <Label className="text-sm font-medium normal-case tracking-normal text-foreground cursor-pointer" htmlFor="client-vat-toggle">
                  {t('wizardForm.vatRegistered')}
                </Label>
                <Switch
                  id="client-vat-toggle"
                  checked={clientVatRegistered}
                  onCheckedChange={(checked) => form.setFieldValue('clientVatRegistered', checked)}
                  size="sm"
                />
              </div>
            )}

            {entityType === 'company' && (
              <form.Field name="clientTaxId">
                {(field) => (
                  <FieldInput
                    label={t('wizardForm.taxId')}
                    placeholder={clientVatRegistered ? '0123456789012' : 'TH9876543210'}
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            {entityType === 'company' && clientVatRegistered && (
              <form.Field name="clientBranchNumber">
                {(field) => (
                  <FieldInput
                    label={t('wizardForm.branch')}
                    placeholder="00000"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )}

            <form.Field name="clientZip">
              {(field) => (
                <FieldInput
                  label={t('wizardForm.zip')}
                  placeholder="10500"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field name="clientCountry">
              {(field) => (
                <FieldInput
                  label={t('wizardForm.country')}
                  placeholder={t('businessPanel.countryPlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>
          </>
        )}
      </form.Subscribe>
    </div>
  )
}
