import { GuestDocumentPage } from '@/components/documents/guest/guest-document-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_guest/view/$token')({
  component: () => <GuestDocumentPage token={Route.useParams().token} />,
})
