import { type SubTab } from "@/components/shells/project-sub-nav";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

const EMPTY_ISSUES_SEARCH = {
  statuses: [] as ("todo" | "in-progress" | "done" | "canceled")[],
  priorities: [] as ("high" | "med" | "low")[],
  tags: [] as string[],
  due: null as "overdue" | "today" | "week" | "month" | null,
  created: null as "today" | "week" | "month" | null,
  milestone: null as string | null,
};

function activeProjectTab(pathname: string): SubTab | "calendar" {
  if (pathname.startsWith("/calendar")) return "calendar";
  if (
    pathname.includes("/issues") ||
    pathname.includes("/board") ||
    pathname.includes("/table")
  )
    return "issues";
  if (pathname.includes("/reports")) return "reports";
  return "overview";
}

const tabBtn =
  "relative flex h-full min-w-0 flex-1 items-center justify-center px-1.5 text-[0.8125rem] font-medium transition-colors";

export function ProjectMobileTabBar({ projectId }: { projectId: string }) {
  const { t } = useTranslation("nav");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeProjectTab(pathname);

  function goIssues() {
    void navigate({
      to: "/projects/$projectId/issues",
      params: { projectId },
      search: EMPTY_ISSUES_SEARCH,
    });
  }

  return (
    <nav
      aria-label={t("workspace")}
      className="fixed inset-x-0 top-0 z-30 border-b border-border-subtle bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl xl:hidden"
    >
      <div className="flex h-12 items-stretch px-3 sm:px-4">
        <Link
          to="/projects/$projectId/overview"
          params={{ projectId }}
          className={cn(
            tabBtn,
            active === "overview"
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {t("overview")}
          {active === "overview" && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground" />
          )}
        </Link>
        <button
          type="button"
          onClick={goIssues}
          className={cn(
            tabBtn,
            active === "issues" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {t("tasks")}
          {active === "issues" && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground" />
          )}
        </button>
        <Link
          to="/projects/$projectId/reports"
          params={{ projectId }}
          className={cn(
            tabBtn,
            active === "reports"
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {t("reports")}
          {active === "reports" && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground" />
          )}
        </Link>
        <Link
          to="/calendar"
          className={cn(
            tabBtn,
            active === "calendar"
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {t("calendar")}
          {active === "calendar" && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground" />
          )}
        </Link>
      </div>
    </nav>
  );
}
