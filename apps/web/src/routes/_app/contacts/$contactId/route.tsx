import { ContactDetailBody } from "@/components/contacts/contact-detail-body";
import { ContactDetails } from "@/components/contacts/contact-details";
import { ContactNotes } from "@/components/contacts/contact-notes";
import { ContactPersona } from "@/components/contacts/contact-persona";
import { ContactPersonaSkeleton } from "@/components/contacts/contact-persona-skeleton";
import { EntityNotFound } from "@/components/ui/entity-not-found";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import { useContacts } from "@/context/contacts";
import { useIsMobileNav } from "@/hooks/use-is-mobile-nav";
import { motionEase } from "@/lib/motion";
import { createFileRoute, stripSearchParams, useRouteContext } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const searchDefaults = { edit: false };

export const Route = createFileRoute("/_app/contacts/$contactId")({
  validateSearch: z.object({
    edit: z.boolean().catch(false),
  }),
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: ContactDetailLayout,
});

function ContactDetailLayout() {
  const { t } = useTranslation("contacts");
  const { contactId } = Route.useParams();
  const { edit: isEditing } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { contacts, loading } = useContacts();
  const { userId } = useRouteContext({ from: "/_app" });
  const detailsPanelKey = `contact-details-panel-open:${userId}`;
  const isMobileNav = useIsMobileNav();
  const [showDetailsPanel, setShowDetailsPanel] = useState(() => {
    try {
      return localStorage.getItem(detailsPanelKey) !== "false";
    } catch {
      return true;
    }
  });
  // Mobile sheet is not persisted and always starts closed — it must never
  // auto-open over the page like the desktop rail is allowed to.
  const [showMobileDetailsSheet, setShowMobileDetailsSheet] = useState(false);
  const detailsOpen = isMobileNav ? showMobileDetailsSheet : showDetailsPanel;

  function setDetailsPanel(open: boolean) {
    if (isMobileNav) {
      setShowMobileDetailsSheet(open);
      return;
    }
    setShowDetailsPanel(open);
    try {
      localStorage.setItem(detailsPanelKey, String(open));
    } catch {}
  }

  function toggleDetailsPanel() {
    setDetailsPanel(!detailsOpen);
  }

  function setIsEditing(editing: boolean) {
    void navigate({ search: (prev) => ({ ...prev, edit: editing }), replace: true });
  }

  const contact = contacts.find((c) => c.id === contactId);

  if (loading && contacts.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <ContactPersonaSkeleton />
      </div>
    );
  }

  if (!contact) {
    return <EntityNotFound backTo="/contacts" />;
  }

  return (
    <div className="@container/contact h-full min-h-0">
      <div className="flex h-full min-h-0 @3xl/contact:flex-row @3xl/contact:overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto max-xl:pb-mobile-dock">
          <div className="page-pad mx-auto w-full max-w-4xl py-6 sm:py-8">
            <ContactPersona
              contact={contact}
              editing={isEditing}
              onEditingChange={setIsEditing}
              detailsOpen={detailsOpen}
              onToggleDetails={toggleDetailsPanel}
            />
            <ContactDetailBody contact={contact} contactId={contactId} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showDetailsPanel && (
            <motion.aside
              key="details-desktop"
              data-testid="contact-details"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: motionEase }}
              className="@container/details relative z-auto hidden h-full shrink-0 flex-col overflow-hidden border-l border-border bg-card @3xl/contact:flex"
            >
              <div className="h-full w-72 max-w-full shrink-0 overflow-y-auto px-6 py-8">
                <p className="mb-5 text-2xs font-medium uppercase tracking-[0.14em] text-caption">
                  {t("details.title")}
                </p>
                <div className="[&>div>h2]:hidden">
                  <ContactDetails contact={contact} />
                </div>
                <ContactNotes
                  notes={contact.notes}
                  className="mt-5 border-t border-border-subtle pt-5"
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sheet portals to document.body, so @3xl/contact never matched here
            and its fixed overlay covered the whole desktop page. Uses its own
            (unpersisted) open state so it never auto-opens over the page —
            see showMobileDetailsSheet above. */}
        <Sheet
          open={showMobileDetailsSheet}
          onOpenChange={setDetailsPanel}
          side="right"
          className="w-72 max-w-[calc(100vw-3rem)] xl:hidden"
          overlayClassName="xl:hidden"
        >
          <SheetDragRegion className="px-5 pt-6">
            <p className="mb-5 text-2xs font-medium uppercase tracking-[0.14em] text-caption">
              {t("details.title")}
            </p>
          </SheetDragRegion>
          <div
            data-testid="contact-details"
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-6"
          >
            <div className="[&>div>h2]:hidden">
              <ContactDetails contact={contact} />
            </div>
            <ContactNotes
              notes={contact.notes}
              className="mt-5 border-t border-border-subtle pt-5"
            />
          </div>
        </Sheet>
      </div>
    </div>
  );
}
