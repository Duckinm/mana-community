import { createFileRoute } from '@tanstack/react-router'
import { LabelsPanel } from '@/components/settings/labels-panel'

export const Route = createFileRoute('/_app/settings/labels')({
 component: LabelsPanel,
})
