import { NewContactModal } from "@/components/contacts/new-contact-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Users } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { RedirectLoadingSkeleton } from "@/components/ui/redirect-loading-skeleton";
import { useContacts } from "@/context/contacts";
import { Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ContactsIndexRedirect() {
  const { t } = useTranslation("contacts");
  const { contacts, loading, isError, refetch } = useContacts();
  const [modalOpen, setModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const shouldOpen = sessionStorage.getItem("fast-lane-open-contact") === "1";
    sessionStorage.removeItem("fast-lane-open-contact");
    return shouldOpen;
  });

  if (loading) return <RedirectLoadingSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <QueryErrorPanel onRetry={refetch} className="max-w-md w-full" />
      </div>
    );
  }

  if (contacts.length > 0) {
    return (
      <Navigate
        to="/contacts/$contactId"
        params={{ contactId: contacts[0].id }}
        search={{ q: "", sort: "projects", edit: false }}
        replace
      />
    );
  }

  return (
    <>
      <NewContactModal open={modalOpen} onOpenChange={setModalOpen} />
      <EmptyState
        icon={Users}
        title={t("empty.title")}
        description={t("empty.description")}
        action={<Button variant="outline" size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus size={12} />
          {t("empty.addContact")}
        </Button>}
      />
    </>
  );
}
