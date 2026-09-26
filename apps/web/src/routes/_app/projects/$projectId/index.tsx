import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/projects/$projectId/')({
 component: RedirectToOverview,
})

function RedirectToOverview() {
 const { projectId } = Route.useParams()
 return <Navigate to="/projects/$projectId/overview" params={{ projectId }} replace />
}
