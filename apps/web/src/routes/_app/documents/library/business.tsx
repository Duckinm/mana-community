import { BusinessPanel } from "@/components/documents/library/business-panel";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  newProfile: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/_app/documents/library/business")({
  validateSearch: searchSchema,
  component: LibraryBusinessPage,
});

function LibraryBusinessPage() {
  const { newProfile } = Route.useSearch();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto max-xl:pb-mobile-dock">
      <div className="px-4 py-7 sm:px-6 lg:px-10">
        <BusinessPanel autoAddProfile={newProfile} />
      </div>
    </div>
  );
}
