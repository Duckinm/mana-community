import { FileText, FolderKanban, Receipt, Users } from "@/components/icons";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export type StepKey = "contact" | "project" | "document" | "transaction";

export const STEP_KEYS: StepKey[] = [
  "contact",
  "project",
  "document",
  "transaction",
];
export const TOTAL_STEPS = STEP_KEYS.length;

export const STEP_ICONS: Record<StepKey, React.ElementType> = {
  contact: Users,
  project: FolderKanban,
  document: FileText,
  transaction: Receipt,
};

export const STEP_PATHS: Record<StepKey, string> = {
  contact: "/contacts",
  project: "/projects",
  document: "/documents/new",
  transaction: "/accounting/transactions",
};

export function quickstartActiveKey(userId: string) {
  return `get-started:quickstart:${userId}`;
}

export function navigateToStep(
  navigate: ReturnType<typeof useNavigate>,
  key: StepKey,
) {
  switch (key) {
    case "contact":
      navigate({ to: "/contacts", search: { q: "", sort: "projects" } });
      return;
    case "project":
      navigate({ to: "/projects" });
      return;
    case "document":
      navigate({ to: "/documents/new", search: { type: "QO" } });
      return;
    case "transaction":
      navigate({
        to: "/accounting/transactions",
        search: {
          txId: "new",
          q: "",
          type: "all",
          status: "all",
          walletId: undefined,
          from: undefined,
          to: undefined,
        },
      });
      return;
  }
}

export function useGetStarted(enabled: boolean) {
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.getStarted,
    queryFn: async () =>
      expectEden(await client.api.users.me["get-started"].get()),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // The sidebar never unmounts, so refetch when the user navigates — that is
  // exactly when they may have just created their first record.
  const isFirstPathRef = useRef(true);
  useEffect(() => {
    if (isFirstPathRef.current) {
      isFirstPathRef.current = false;
      return;
    }
    if (!enabled) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.getStarted });
  }, [pathname, enabled, queryClient]);

  const done: Record<StepKey, boolean> = {
    contact: data?.hasContact ?? false,
    project: data?.hasProject ?? false,
    document: data?.hasDocument ?? false,
    transaction: data?.hasTransaction ?? false,
  };
  const completed = STEP_KEYS.filter((key) => done[key]).length;

  return { data, isPending, isError, refetch, done, completed };
}
