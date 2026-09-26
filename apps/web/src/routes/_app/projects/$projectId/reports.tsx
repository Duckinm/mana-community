import { createFileRoute } from '@tanstack/react-router'
import { useProjects } from '@/context/projects'
import { ReportsTab } from '@/components/projects/reports-tab'

export const Route = createFileRoute('/_app/projects/$projectId/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  const { projectId } = Route.useParams()
  const { projects } = useProjects()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]

  return <ReportsTab project={project} />
}
