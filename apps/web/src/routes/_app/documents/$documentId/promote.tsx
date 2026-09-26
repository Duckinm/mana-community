import { PromotionPage } from "@/components/documents/promotion/promotion-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/documents/$documentId/promote")({
  component: () => (
    <div className="flex h-full flex-col">
      <PromotionPage documentId={Route.useParams().documentId} />
    </div>
  ),
});
