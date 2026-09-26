import { AccountingDashboard } from '@/components/accounting/accounting-dashboard'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/accounting/')({
  component: AccountingDashboard,
})
