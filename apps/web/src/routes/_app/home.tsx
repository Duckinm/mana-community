import { WorkspaceHome } from '@/components/onboarding/workspace-home'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/home')({ component: WorkspaceHome })
