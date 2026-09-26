import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "@/components/icons";
import { useStorage } from "@/context/storage";
import { FilePreviewPanel } from "@/components/storage/file-preview-panel";

export const Route = createFileRoute("/_app/storage/$folderId/$fileId")({
  component: StorageFilePage,
});

function StorageFilePage() {
  const { t } = useTranslation("storage");
  const { folderId, fileId } = Route.useParams();
  const { getFilesInFolder, getFolderById, getEntityFiles, loading } =
    useStorage();
  const folder = getFolderById(folderId);
  const file = (
    folder ? getFilesInFolder(folderId) : getEntityFiles("project", folderId)
  ).find((f) => f.id === fileId);
  const folderName = folder?.name;

  if (!file) {
    return loading ? null : (
      <div className="px-4 py-5 text-sm text-muted-foreground sm:px-6 lg:px-10 lg:py-6">
        {t("fileNotFound")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-5 sm:px-6 lg:px-10 lg:py-6">
      <div className="flex items-center gap-1.5 text-sm text-caption">
        <Link
          to="/storage/$folderId"
          params={{ folderId }}
          search={{ q: "", sort: "name-asc", kind: "all", tag: undefined }}
          className="hover:text-muted-foreground transition-colors duration-fast"
        >
          {folderName ?? t("pageTitle")}
        </Link>
        <ChevronRight size={12} />
        <span className="text-foreground font-medium">{file.name}</span>
      </div>

      <FilePreviewPanel file={file} />
    </div>
  );
}
