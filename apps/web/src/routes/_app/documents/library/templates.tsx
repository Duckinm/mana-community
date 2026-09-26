import { TemplateLibraryPanel } from "@/components/documents/library/template-library-panel";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().catch(""),
  sort: z
    .enum(["name-asc", "name-desc", "price-asc", "price-desc", "qty-asc", "qty-desc"])
    .catch("name-asc"),
});
const searchDefaults = { q: "", sort: "name-asc" };

export const Route = createFileRoute("/_app/documents/library/templates")({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: LibraryTemplatesPage,
});

function LibraryTemplatesPage() {
  const { q, sort } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <TemplateLibraryPanel
      tab="templates"
      onTabChange={() => {}}
      hideTabBar
      tabSize="md"
      query={q}
      onQueryChange={(query) =>
        navigate({ search: (prev) => ({ ...prev, q: query }), replace: true, resetScroll: false })
      }
      sort={sort}
      onSortChange={(next) =>
        navigate({
          search: (prev) => ({ ...prev, sort: next as (typeof prev)["sort"] }),
          replace: true,
          resetScroll: false,
        })
      }
    />
  );
}
