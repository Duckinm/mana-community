import {
  alertLabel,
  eventKind,
  formatEventSchedule,
  formatOverlaySchedule,
  kindLabelKey,
  overlayKind,
  overlaySignalLabelKey,
  type CalendarItemKind,
} from "@/components/calendar/calendar-event-meta";
import { RecurrenceScopeDialog } from "@/components/calendar/recurrence-scope-dialog";
import type {
  CalendarEvent,
  CalendarOverlay,
  RecurrenceMutationOptions,
} from "@/components/calendar/types";
import {
  ArrowUpRight,
  Bell,
  CalendarIcon,
  Globe,
  MoreHorizontal,
  Pencil,
  Repeat,
  Text,
  Trash2,
  User,
} from "@/components/icons";
import { accountColorVar, buildAccountColorMap } from "@/components/calendar/account-colors";
import { useCalendarConnection } from "@/hooks/use-calendar-connection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { menuItemDestructive } from "@/components/ui/menu-styles";
import type { RecurrenceScope } from "@/lib/calendar-recurrence";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type EventDetailState = {
  event: CalendarEvent;
  instanceStart?: string;
};

type OverlayDetailState = CalendarOverlay;

type EventDetailDialogProps = {
  eventDetail: EventDetailState | null;
  overlayDetail: OverlayDetailState | null;
  isPending?: boolean;
  onClose: () => void;
  onEdit: (event: CalendarEvent, instanceStart?: string) => void;
  onDelete: (
    event: CalendarEvent,
    opts?: RecurrenceMutationOptions,
  ) => Promise<void>;
  onOpenOverlay: (overlay: CalendarOverlay) => void;
};

const KIND_DOT: Record<CalendarItemKind, string> = {
  native: "bg-primary",
  google: "bg-info",
  milestone: "bg-category-orange",
  document: "bg-category-purple",
};

function KindIndicator({ kind }: { kind: CalendarItemKind }) {
  const { t } = useTranslation("calendar");

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-1.5 shrink-0 rounded-full", KIND_DOT[kind])} />
      {t(kindLabelKey(kind))}
    </span>
  );
}

function MetaRow({
  icon: Icon,
  children,
}: {
  icon: typeof Bell;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon
        size={14}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 text-foreground/90">{children}</span>
    </div>
  );
}

export function EventDetailDialog({
  eventDetail,
  overlayDetail,
  isPending,
  onClose,
  onEdit,
  onDelete,
  onOpenOverlay,
}: EventDetailDialogProps) {
  const { t } = useTranslation("calendar");
  const [scopeMode, setScopeMode] = useState(false);
  const { connection } = useCalendarConnection();
  const accountColorMap = buildAccountColorMap(
    (connection?.calendars ?? []).map((c) => c.accountEmail),
  );

  const open = !!eventDetail || !!overlayDetail;
  const event = eventDetail?.event ?? null;
  const instanceStart = eventDetail?.instanceStart;
  const overlay = overlayDetail;

  const needsScope =
    !!event?.rrule && !event.recurringEventId && !!instanceStart;

  async function handleDelete(scope?: RecurrenceScope) {
    if (!event) return;
    const opts: RecurrenceMutationOptions | undefined = scope
      ? { scope, instanceStart }
      : undefined;
    await onDelete(event, opts);
    setScopeMode(false);
    onClose();
  }

  function handleDeleteClick() {
    if (needsScope) {
      setScopeMode(true);
      return;
    }
    void handleDelete();
  }

  if (overlay) {
    const kind = overlayKind(overlay);
    const signalLabelKey = overlaySignalLabelKey(overlay);
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="px-5 pb-5 pt-5">
            <KindIndicator kind={kind} />
            <DialogTitle className="mt-2 text-xl font-semibold leading-tight tracking-tight">
              {overlay.title}
            </DialogTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {formatOverlaySchedule(overlay)}
            </p>
            {signalLabelKey ? (
              <p className="mt-4 rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground/90">
                {t(signalLabelKey)}
              </p>
            ) : null}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t("detail.overlayHint")}
            </p>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onOpenOverlay(overlay);
                  onClose();
                }}
              >
                {overlay.documentId
                  ? t("detail.openDocument")
                  : t("detail.openProject")}
                <ArrowUpRight size={14} strokeWidth={2} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!event) return null;

  const kind = eventKind(event);
  // Matches the grid: the chip names the calendar, while `kind` still gates the
  // "edit it in Google" hint that only applies to Google's own copies.
  const calendarKind = event.calendarName ? "google" : kind;
  const schedule = formatEventSchedule(event, instanceStart);
  const alert = alertLabel(event.alertMinutes, t);
  const canEdit = kind === "native" || kind === "google";
  const hasMeta =
    !!event.location ||
    !!event.contactName ||
    !!alert ||
    !!event.rrule ||
    !!event.note;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="px-5 pb-5 pt-5">
            <KindIndicator kind={calendarKind} />
            <div className="mt-2 flex items-center gap-2">
              <DialogTitle className="min-w-0 text-xl font-semibold leading-tight tracking-tight">
                {event.title}
              </DialogTitle>
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-foreground/70 hover:text-foreground"
                      aria-label={t("detail.moreActions")}
                      disabled={isPending}
                    >
                      <MoreHorizontal size={16} strokeWidth={2.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        onEdit(event, instanceStart);
                        onClose();
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                      {t("detail.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={menuItemDestructive}
                      onSelect={handleDeleteClick}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                      {t("form.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            {schedule ? (
              <p className="mt-1.5 text-sm text-muted-foreground">{schedule}</p>
            ) : null}

            {event.calendarName ? (
              <div className="mt-5 flex items-center gap-2.5 text-sm">
                <CalendarIcon
                  size={14}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <span className="flex min-w-0 items-center gap-1.5 text-foreground/90">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{
                      background: `var(${accountColorVar(event.accountEmail, accountColorMap)})`,
                    }}
                    aria-hidden
                  />
                  <span className="truncate">
                    {event.calendarName === event.accountEmail || !event.accountEmail
                      ? event.calendarName
                      : t("detail.calendarSource", {
                          calendarName: event.calendarName,
                          accountEmail: event.accountEmail,
                        })}
                  </span>
                </span>
              </div>
            ) : null}

            {hasMeta ? (
              <div className="mt-5 space-y-2.5">
                {event.location ? (
                  <MetaRow icon={Globe}>{event.location}</MetaRow>
                ) : null}
                {event.contactName ? (
                  <MetaRow icon={User}>{event.contactName}</MetaRow>
                ) : null}
                {alert ? <MetaRow icon={Bell}>{alert}</MetaRow> : null}
                {event.rrule ? (
                  <MetaRow icon={Repeat}>{t("detail.recurringYes")}</MetaRow>
                ) : null}
                {event.note ? (
                  <MetaRow icon={Text}>{event.note}</MetaRow>
                ) : null}
              </div>
            ) : null}

            {kind === "google" ? (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {t("detail.googleHint")}
              </p>
            ) : null}

          </div>
        </DialogContent>
      </Dialog>

      <RecurrenceScopeDialog
        open={scopeMode}
        mode="delete"
        onClose={() => setScopeMode(false)}
        onSelect={(scope) => void handleDelete(scope)}
      />
    </>
  );
}
