import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/documents/library/")({
  validateSearch: (search: Record<string, unknown>) => search,
  beforeLoad: ({ search }) => {
    if (search.tab === "business") {
      throw redirect({ to: "/documents/library/business", replace: true });
    }
    if (search.tab === "packages") {
      throw redirect({
        to: "/documents/library/packages",
        search: { q: "", sort: "updated-desc" },
        replace: true,
      });
    }
    throw redirect({
      to: "/documents/library/templates",
      search: { q: "", sort: "name-asc" },
      replace: true,
    });
  },
});
