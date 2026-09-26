import { DocumentWizard } from "@/components/documents/wizard/document-wizard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/documents/new")({
  validateSearch: (s: Record<string, unknown>) => {
    const search: {
      type: "QO" | "INV" | "RC";
      projectId?: string;
      contactId?: string;
    } = {
      type: (["QO", "INV", "RC"].includes(s.type as string)
        ? s.type
        : "QO") as "QO" | "INV" | "RC",
    };
    if (typeof s.projectId === "string") search.projectId = s.projectId;
    if (typeof s.contactId === "string") search.contactId = s.contactId;
    return search;
  },
  component: NewDocumentPage,
});

function NewDocumentPage() {
  const { type, projectId, contactId } = Route.useSearch();

  return (
    <div className="h-full flex flex-col">
      <DocumentWizard
        documentType={type}
        defaultProjectId={projectId}
        defaultContactId={contactId}
        backTo="/documents"
      />
    </div>
  );
}
