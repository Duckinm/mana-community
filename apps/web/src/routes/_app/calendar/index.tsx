import { CalendarPage } from '@/components/calendar/calendar-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/calendar/')({
  component: CalendarPage,
})
