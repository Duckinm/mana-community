import { TemplateLibraryPanel } from "@/components/documents/library/template-library-panel";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().catch(""),
  sort: z
    .enum([
      "name-asc",
      "name-desc",
      "items-asc",
      "items-desc",
      "updated-asc",
      "updated-desc",
    ])
    .catch("updated-desc"),
});
const searchDefaults = { q: "", sort: "updated-desc" };

export const Route = createFileRoute("/_app/documents/library/packages")({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: LibraryPackagesPage,
});

function LibraryPackagesPage() {
  const { q, sort } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <TemplateLibraryPanel
      tab="packages"
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
