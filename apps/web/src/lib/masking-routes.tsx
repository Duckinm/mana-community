import { routeTree } from "@/routeTree.gen";
import { createRouteMask } from "@tanstack/react-router";

export const documentModalMask = createRouteMask({
  routeTree,
  from: "/projects/$projectId/documents/$documentId/modal",
  to: "/documents/$documentId",
  params: ({ documentId }) => ({ documentId }),
});

export const storageFileModalMask = createRouteMask({
  routeTree,
  from: "/projects/$projectId/storage/$fileId/modal",
  to: "/storage/$folderId/$fileId",
  params: ({ projectId, fileId }) => ({ folderId: projectId, fileId }),
  search: { q: "", sort: "name-asc", kind: "all" },
});
