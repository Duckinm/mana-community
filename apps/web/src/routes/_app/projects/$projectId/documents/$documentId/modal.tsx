import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DocumentDetailPage } from "@/components/documents/document-detail-page";

export const Route = createFileRoute("/_app/projects/$projectId/documents/$documentId/modal")({
  component: DocumentModal,
});

function DocumentModal() {
  const { projectId, documentId } = Route.useParams();
  const navigate = useNavigate();

  function close() {
    navigate({ to: "/projects/$projectId/overview", params: { projectId } });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DocumentDetailPage documentId={documentId} />
      </DialogContent>
    </Dialog>
  );
}
