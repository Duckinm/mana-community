import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStorage } from "@/context/storage";
import { FilePreviewModal } from "@/components/storage/file-preview-modal";

export const Route = createFileRoute("/_app/projects/$projectId/storage/$fileId/modal")({
  component: StorageFileModal,
});

function StorageFileModal() {
  const { projectId, fileId } = Route.useParams();
  const navigate = useNavigate();
  const { getEntityFiles } = useStorage();
  const file = getEntityFiles("project", projectId).find((f) => f.id === fileId) ?? null;

  return (
    <FilePreviewModal
      file={file}
      onClose={() => navigate({ to: "/projects/$projectId/overview", params: { projectId } })}
    />
  );
}
