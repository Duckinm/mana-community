import { Bookmark } from '@/components/icons'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useItemTemplates } from '@/hooks/use-item-templates'

interface SaveAsTemplateButtonProps {
  description: string
  qty: number
  amount: number
  currency: string
}

export function SaveAsTemplateButton({ description, qty, amount, currency }: SaveAsTemplateButtonProps) {
  const { t } = useTranslation('documents')
  const { createTemplate, isCreating } = useItemTemplates()

  async function handleSave() {
    if (!description.trim()) return
    await createTemplate({
      name: description.trim(),
      description: description.trim(),
      defaultQty: Math.round(qty * 100),
      defaultUnitPriceCents: Math.round(amount * 100),
      currency,
    })
    toast.success(t('saveAsTemplateButton.savedToLibrary'))
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isCreating || !description.trim()}
      title="Save to item library"
      className="flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-warning disabled:opacity-0 text-muted-foreground"
      tabIndex={-1}
    >
      <Bookmark size={12} />
    </button>
  )
}
