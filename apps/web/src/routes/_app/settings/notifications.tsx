import { NotificationsPanel } from '@/components/settings/notifications-panel'
import { SettingsPanelSkeleton } from '@/components/settings/settings-panel-skeleton'
import { useSettings } from '@/context/settings'
import { useLineConnection } from '@/hooks/use-line-connection'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/notifications')({
 component: NotificationsRoute,
})

function NotificationsRoute() {
 const { loading } = useSettings()
 const { isLoading: lineIsLoading } = useLineConnection()
 if (loading || lineIsLoading) return <SettingsPanelSkeleton />
 return <NotificationsPanel />
}
