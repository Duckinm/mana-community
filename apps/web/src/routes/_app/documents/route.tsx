import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsLayout,
});

function DocumentsLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Outlet />
    </div>
  );
}
