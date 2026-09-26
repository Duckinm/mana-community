import { createFileRoute } from '@tanstack/react-router'
import { AIPanel } from '@/components/settings/ai-panel'
import { AIPanelSkeleton } from '@/components/settings/ai-panel-skeleton'
import { useSettings } from '@/context/settings'

export const Route = createFileRoute('/_app/settings/ai')({
 component: AIRoute,
})

function AIRoute() {
 const { loading } = useSettings()
 if (loading) return <AIPanelSkeleton />
 return <AIPanel />
}
