import { DocumentList } from "@/components/documents/document-list";
import { DocumentListSkeleton } from "@/components/documents/document-list-skeleton";
import { DocumentPagination } from "@/components/documents/document-pagination";
import {
  getLastDocumentsView,
  setLastDocumentsView,
  type DocumentsView,
} from "@/components/documents/document-view-switcher";
import { NewDocumentMenu } from "@/components/documents/new-document-menu";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { Button } from "@/components/ui/button";
import { useDocumentsPageState } from "@/hooks/use-documents-page-state";
import { fadeUp } from "@/lib/motion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { z } from "zod";
import { ChevronDown, Plus } from "@/components/icons";
import { CALENDAR_DATE_RE } from "@/lib/calendar-date";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const documentsSearchSchema = z.object({
  type: z.enum(["QO", "INV", "RC"]).optional(),
  status: z.enum(["draft", "published", "archived", "overdue"]).optional(),
  projectId: z.string().optional(),
  recurring: z.boolean().optional(),
  paid: z.enum(["paid", "unpaid"]).optional(),
  q: z.string().optional(),
  from: z.string().regex(CALENDAR_DATE_RE).optional(),
  to: z.string().regex(CALENDAR_DATE_RE).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(100),
  sortId: z.string().optional(),
  sortDesc: z.boolean().optional(),
});

export type DocumentsSearch = z.infer<typeof documentsSearchSchema>;

export const Route = createFileRoute("/_app/documents/")({
  validateSearch: documentsSearchSchema,
  component: DocumentsPage,
});

function DocumentsPage() {
  const { t } = useTranslation("documents");
  const navigate = useNavigate();
  const [view, setView] = useState<DocumentsView>(getLastDocumentsView);
  const {
    documents,
    isPending,
    isError,
    refetch,
    currentPage,
    totalPages,
    sorting,
    columnFilters,
    searchQuery,
    onSearchChange,
    onSortingChange,
    onColumnFiltersChange,
    onPageChange,
  } = useDocumentsPageState();

  function handleViewChange(next: DocumentsView) {
    setView(next);
    setLastDocumentsView(next);
  }

  return (
    <motion.div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
      <div className="page-pad">
        <motion.div {...fadeUp} className="mb-5 max-xl:mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {t("pageTitle")}
              </h1>
              <p className="text-xs text-muted-foreground max-xl:sr-only">
                {t("pageSubtitle")}
              </p>
            </div>
            <NewDocumentMenu
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t("newDocument")}
                  className="size-9 shrink-0 px-0 [@media(pointer:coarse)]:size-9 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3 [@media(pointer:coarse)]:sm:h-8 [@media(pointer:coarse)]:sm:w-auto"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span className="hidden sm:inline">{t("newDocument")}</span>
                  <ChevronDown
                    size={13}
                    className="hidden opacity-70 sm:inline"
                  />
                </Button>
              }
            />
          </div>
        </motion.div>

        <div className="space-y-4">
          {isPending ? (
            <DocumentListSkeleton view={view} />
          ) : isError ? (
            <QueryErrorPanel onRetry={refetch} />
          ) : (
            <DocumentList
              documents={documents}
              sorting={sorting}
              onSortingChange={onSortingChange}
              columnFilters={columnFilters}
              onColumnFiltersChange={onColumnFiltersChange}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              view={view}
              onViewChange={handleViewChange}
              onNew={() =>
                void navigate({ to: "/documents/new", search: { type: "QO" } })
              }
            />
          )}

          {!isPending && totalPages > 1 && (
            <DocumentPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
