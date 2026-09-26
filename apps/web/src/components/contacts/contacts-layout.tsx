import type { SortMode } from "@/components/contacts/contact-book";
import { ContactBook } from "@/components/contacts/contact-book";
import { ContactBookSkeleton } from "@/components/contacts/contact-book-skeleton";
import { ContactPersonaSkeleton } from "@/components/contacts/contact-persona-skeleton";
import { ContactDetailBodySkeleton } from "@/components/contacts/contact-detail-body-skeleton";
import { BulkActionBar } from "@/components/contacts/bulk-action-bar";
import { useContacts } from "@/context/contacts";
import { fadeIn, motionEase } from "@/lib/motion";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import {
  getRouteApi,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CsvImportModal } from "@/components/contacts/csv-import-modal";
import { NewContactModal } from "@/components/contacts/new-contact-modal";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
const contactsRoute = getRouteApi('/_app/contacts')

export function ContactsLayout() {
  const { t } = useTranslation("contacts");
  const {
    contacts,
    loading: isLoading,
    sidebarOpen,
    setSidebarOpen,
    importOpen,
    setImportOpen,
    newContactOpen,
    setNewContactOpen,
  } = useContacts();
  const navigate = useNavigate();
  const { q, sort } = contactsRoute.useSearch();
  const { contactId } = useParams({ strict: false }) as { contactId?: string };
  const selectedId = contactId ?? contacts[0]?.id ?? "";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    if (contactId && window.matchMedia("(max-width: 1023px)").matches) {
      setSidebarOpen(false);
    }
  }, [contactId, setSidebarOpen]);

  function handleSelectionChange(ids: Set<string>) {
    setSelectedIds(ids);
    if (ids.size === 0) setSelectionMode(false);
  }

  function handleSelect(id: string) {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setSidebarOpen(false);
    }
    navigate({
      to: "/contacts/$contactId",
      params: { contactId: id },
      search: { q, sort, edit: false },
      resetScroll: false,
    });
  }
  function handleSearch(query: string) {
    navigate({
      to: "/contacts/$contactId",
      params: { contactId: selectedId },
      search: { q: query, sort, edit: false },
      replace: true,
      resetScroll: false,
    });
  }
  function handleSort(s: SortMode) {
    navigate({
      to: "/contacts/$contactId",
      params: { contactId: selectedId },
      search: { q, sort: s, edit: false },
      replace: true,
      resetScroll: false,
    });
  }

  const directoryOpen = sidebarOpen && (isLoading || contacts.length > 0);

  return (
    <div className="flex min-h-0 flex-1">
      <AnimatePresence initial={false}>
        {directoryOpen && (
          <motion.div
            key="sidebar-desktop"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: motionEase }}
            className="relative z-auto hidden h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card xl:flex"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="sk" {...fadeIn} className="flex-1">
                  <ContactBookSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key="book"
                  {...fadeIn}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <ContactBook
                    contacts={contacts}
                    selectedId={selectedId}
                    query={q}
                    sort={sort}
                    onSelect={handleSelect}
                    onSearch={handleSearch}
                    onSort={handleSort}
                    selectedIds={selectedIds}
                    selectionMode={selectionMode}
                    onSelectionModeChange={setSelectionMode}
                    onSelectionChange={handleSelectionChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={directoryOpen}
        onOpenChange={setSidebarOpen}
        side="left"
        className="w-64 max-w-[calc(100vw-3rem)] xl:hidden"
        overlayClassName="xl:hidden"
      >
        <SheetDragRegion className="sr-only">Directory</SheetDragRegion>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="sk" {...fadeIn} className="flex-1">
              <ContactBookSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="book"
              {...fadeIn}
              className="flex min-h-0 flex-1 flex-col"
            >
              <ContactBook
                contacts={contacts}
                selectedId={selectedId}
                query={q}
                sort={sort}
                onSelect={(id) => {
                  handleSelect(id);
                  setSidebarOpen(false);
                }}
                onSearch={handleSearch}
                onSort={handleSort}
                selectedIds={selectedIds}
                selectionMode={selectionMode}
                onSelectionModeChange={setSelectionMode}
                onSelectionChange={handleSelectionChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Sheet>

      <CsvImportModal open={importOpen} onOpenChange={setImportOpen} />
      <NewContactModal open={newContactOpen} onOpenChange={setNewContactOpen} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <h1 className="sr-only">{t("layout.title")}</h1>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="ps" {...fadeIn} className="px-4 py-4">
                  <ContactPersonaSkeleton />
                  <ContactDetailBodySkeleton />
                </motion.div>
              ) : (
                <Outlet />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        onClear={() => {
          setSelectedIds(new Set());
          setSelectionMode(false);
        }}
      />
    </div>
  );
}
