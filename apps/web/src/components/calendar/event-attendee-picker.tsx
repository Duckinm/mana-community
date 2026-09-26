import { User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useContacts } from '@/context/contacts'
import { cn } from '@/lib/utils'

type EventAttendeePickerProps = {
  value: string
  onChange: (contactId: string) => void
}

export function EventAttendeePicker({ value, onChange }: EventAttendeePickerProps) {
  const { t } = useTranslation('calendar')
  const { contacts } = useContacts()

  return (
    <Select
      value={value || '__none__'}
      onValueChange={(id) => onChange(id === '__none__' ? '' : id)}
    >
      <SelectTrigger
        className={cn('[&>span]:flex-1', !value && 'text-muted-foreground')}
      >
        <User className="mr-2 size-3.5 shrink-0 opacity-60" />
        <SelectValue placeholder={t('form.attendeePlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{t('form.noAttendee')}</SelectItem>
        {contacts.map((contact) => (
          <SelectItem key={contact.id} value={contact.id}>
            {contact.name}
            {contact.company ? ` — ${contact.company}` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
