import { createFileRoute } from '@tanstack/react-router'
import { UsagePanel } from '@/components/settings/usage-panel'

export const Route = createFileRoute('/_app/settings/usage')({
  component: UsagePanel,
})
