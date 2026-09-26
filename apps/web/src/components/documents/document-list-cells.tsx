import { RECURRING_INTERVAL_KEYS } from "@/components/documents/constants";
import { DocumentNumber } from "@/components/documents/document-number";
import type { Document } from "@/components/documents/types";
import { Eye, Repeat, TriangleAlert } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCalendarDate } from "@/lib/calendar-date";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

const SLIP_NEEDS_REVIEW_STATUSES = new Set([
  "proposed",
  "mismatched",
  "failed",
]);

export function DocumentPrimaryCell({ doc }: { doc: Document }) {
  const { t } = useTranslation("documents");
  const slipNeedsReview =
    doc.type === "INV" &&
    !!doc.latestPaymentSlipStatus &&
    SLIP_NEEDS_REVIEW_STATUSES.has(doc.latestPaymentSlipStatus);

  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <DocumentNumber
        number={doc.number || "—"}
        type={doc.type}
        className="shrink-0 text-sm text-foreground"
      />
      {slipNeedsReview && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              size="pill-sm"
              className="shrink-0 cursor-default gap-1 bg-warning-soft text-warning border border-warning-border"
            >
              <TriangleAlert size={11} weight="fill" />
              {t("list.slipNeedsReview")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("list.slipNeedsReviewTooltip")}
          </TooltipContent>
        </Tooltip>
      )}
      {doc.isRecurring && doc.recurringInterval && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex shrink-0 cursor-default items-center">
              <Repeat size={12} style={{ color: "var(--category-purple)" }} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t(RECURRING_INTERVAL_KEYS[doc.recurringInterval])}
            {doc.nextGenerationDate &&
              ` · ${t("listCells.nextGeneration", { date: formatCalendarDate(doc.nextGenerationDate) })}`}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function DocumentClientCell({ doc }: { doc: Document }) {
  const { t } = useTranslation("documents");
  const navigate = useNavigate();

  return (
    <span className="block truncate text-xs text-muted-foreground">
      {doc.clientName ? (
        doc.contactExists && doc.contactId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary hover:underline underline-offset-2 decoration-muted-foreground/50 transition-colors"
              >
                {doc.clientName}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onSelect={() =>
                  navigate({
                    to: "/contacts/$contactId",
                    params: { contactId: doc.contactId! },
                    search: { q: "", sort: "projects" as const, edit: false },
                  })
                }
              >
                <Eye size={12} />
                {t("actionsMenu.view")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          doc.clientName
        )
      ) : (
        <span className="italic">{t("list.noClient")}</span>
      )}
    </span>
  );
}
