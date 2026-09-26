import { DocumentDetailPage } from '@/components/documents/document-detail-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/documents/$documentId/')({
  component: () => (
    <div className="page-scroll">
      <DocumentDetailPage documentId={Route.useParams().documentId} />
    </div>
  ),
})
