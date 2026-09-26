import { createFileRoute } from '@tanstack/react-router'
import { CommunityPanel } from '@/components/settings/community-panel'

export const Route = createFileRoute('/_app/settings/community')({
 component: CommunityPanel,
})
