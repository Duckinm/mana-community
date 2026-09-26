import { AppearancePanel } from '@/components/settings/appearance-panel'
import { SettingsPanelSkeleton } from '@/components/settings/settings-panel-skeleton'
import { useSettings } from '@/context/settings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/appearance')({
 component: AppearanceRoute,
})

function AppearanceRoute() {
 const { loading } = useSettings()
 if (loading) return <SettingsPanelSkeleton />
 return <AppearancePanel />
}
