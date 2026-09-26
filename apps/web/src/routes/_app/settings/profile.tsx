import { LinkedAccountsPanel } from "@/components/settings/linked-accounts-panel";
import { ProfilePanel } from "@/components/settings/profile-panel";
import { ProfilePanelSkeleton } from "@/components/settings/profile-panel-skeleton";
import { useSettings } from "@/context/settings";
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

const profileSearchSchema = z.object({
  error: z.string().catch(""),
});

const searchDefaults = { error: "" };

export const Route = createFileRoute("/_app/settings/profile")({
  validateSearch: profileSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: ProfileRoute,
});

function ProfileRoute() {
  const { t } = useTranslation("settings");
  const { user, loading } = useSettings();
  const { error } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  useEffect(() => {
    if (!error) return;
    const key =
      error === "account_already_linked_to_different_user"
        ? "linkedAccounts.alreadyLinkedToOther"
        : "linkedAccounts.connectFailed";
    toast.error(t(key));
    navigate({ search: { error: "" }, replace: true });
  }, [error]);

  if (loading) return <ProfilePanelSkeleton />;

  return (
    <div>
      <ProfilePanel user={user} />
      <LinkedAccountsPanel />
    </div>
  );
}
