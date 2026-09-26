import { DocumentWizard } from "@/components/documents/wizard/document-wizard";
import { DocumentWizardSkeleton } from "@/components/documents/wizard/document-wizard-skeleton";
import { applyDocumentDisplayStatus } from "@/lib/document-display-status";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/documents/$documentId/edit")({
  component: EditDocumentPage,
});

function EditDocumentPage() {
  const { documentId } = Route.useParams();

  const { data: doc, isLoading } = useQuery({
    queryKey: queryKeys.document(documentId),
    queryFn: async () =>
      applyDocumentDisplayStatus(
        expectEden(await client.api.documents({ id: documentId }).get()),
      ),
  });

  if (isLoading) return <DocumentWizardSkeleton />;
  if (!doc)
    return (
      <div className="px-4 py-5 text-sm text-muted-foreground sm:px-6 lg:px-10 lg:py-6">
        Document not found.
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <DocumentWizard
        documentType={doc.type}
        initialData={doc}
        backTo={`/documents/${doc.id}`}
      />
    </div>
  );
}
