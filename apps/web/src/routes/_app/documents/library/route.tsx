import { LibraryTabBar } from "@/components/documents/library/library-tab-bar";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_app/documents/library")({
  component: LibraryLayout,
});

function LibraryLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tab = pathname.endsWith("/packages")
    ? "packages"
    : pathname.endsWith("/business")
      ? "business"
      : "templates";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <LibraryTabBar
        tab={tab}
        onTabChange={(t) =>
          navigate({
            to: `/documents/library/${t}`,
            search: t === "business" ? undefined : { q: "" },
          })
        }
      />
      <Outlet />
    </div>
  );
}
