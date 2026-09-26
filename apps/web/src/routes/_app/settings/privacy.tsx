import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPanel } from '@/components/settings/privacy-panel'

export const Route = createFileRoute('/_app/settings/privacy')({
 component: PrivacyPanel,
})
