import { EventAttendeePicker } from "@/components/calendar/event-attendee-picker";
import { RecurrenceFields } from "@/components/calendar/recurrence-fields";
import { RecurrenceScopeDialog } from "@/components/calendar/recurrence-scope-dialog";
import { TimeConflictNotice } from "@/components/calendar/time-conflict-notice";
import type {
  CalendarEvent,
  CalendarEventInput,
  RecurrenceMutationOptions,
} from "@/components/calendar/types";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  addCalendarDays,
  normalizeCalendarDateField,
  toCalendarDateString,
  todayCalendarDate,
} from "@/lib/calendar-date";
import {
  calendarSpanDays,
  clampEndDate,
  endDateForStart,
} from "@/components/calendar/event-date-range";
import {
  defaultRecurrenceFormValues,
  eventDtstart,
  formToRrule,
  rruleToForm,
  type RecurrenceFormValues,
  type RecurrenceScope,
} from "@/lib/calendar-recurrence";
import i18next from "@/lib/i18n";
import { parseTimestamp } from "@/lib/timestamp";
import { fieldError } from "@/lib/utils";
import { useCalendarConnection } from "@/hooks/use-calendar-connection";
import { useForm } from "@tanstack/react-form";
import { AlignLeft, Bell, CalendarDays, MapPin, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const LOCAL_TARGET = "local";

const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, {
        message: i18next.t("form.titleRequired", { ns: "calendar" }),
      }),
    allDay: z.boolean(),
    startDate: z.string(),
    endDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    alertMinutes: z.array(z.number()),
    contactId: z.string(),
    note: z.string(),
    location: z.string(),
    target: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.allDay) {
      if (!value.startDate) {
        ctx.addIssue({
          code: "custom",
          message: i18next.t("form.startRequired", { ns: "calendar" }),
          path: ["startDate"],
        });
      }
      if (value.endDate && value.endDate < value.startDate) {
        ctx.addIssue({
          code: "custom",
          message: i18next.t("form.endBeforeStart", { ns: "calendar" }),
          path: ["endDate"],
        });
      }
      return;
    }
    if (!value.startDate || !value.startTime || !value.endTime) {
      ctx.addIssue({
        code: "custom",
        message: i18next.t("form.startRequired", { ns: "calendar" }),
        path: ["startDate"],
      });
      return;
    }
    const endsAfterStart =
      value.endDate && value.endDate !== value.startDate
        ? value.endDate > value.startDate
        : value.endTime > value.startTime;
    if (!endsAfterStart) {
      ctx.addIssue({
        code: "custom",
        message: i18next.t("form.endTimeBeforeStart", { ns: "calendar" }),
        path: ["endTime"],
      });
    }
  });

type EventFormValues = z.infer<typeof eventSchema>;

function dateFromInstant(iso: string | null | undefined): string | null {
  const d = parseTimestamp(iso);
  return d ? toCalendarDateString(d) : null;
}

function timeFromInstant(
  iso: string | null | undefined,
  fallback: string,
): string {
  const d = parseTimestamp(iso);
  if (!d) return fallback;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function storedEnd(start: string, end: string | null | undefined): string {
  const normalizedStart = normalizeCalendarDateField(start) ?? start;
  return normalizeCalendarDateField(end) ?? normalizedStart;
}

function eventToFormValues(
  event: CalendarEvent | null,
  defaults?: Partial<CalendarEventInput>,
  instanceStart?: string | null,
  defaultTarget = LOCAL_TARGET,
): EventFormValues {
  const target = event
    ? event.syncToGoogle
      ? (event.calendarConnectionId ?? defaultTarget)
      : LOCAL_TARGET
    : defaultTarget;

  const today = todayCalendarDate();
  const now = new Date();
  const startTimeDefault = `${String(now.getHours()).padStart(2, "0")}:00`;
  const endTimeDefault = `${String(now.getHours() + 1).padStart(2, "0")}:00`;

  if (event) {
    const instanceDate = instanceStart
      ? normalizeCalendarDateField(instanceStart.slice(0, 10))
      : null;

    if (event.allDay) {
      const masterStart =
        normalizeCalendarDateField(event.startDate) ??
        dateFromInstant(event.startAt) ??
        today;
      const masterEnd = storedEnd(masterStart, event.endDate ?? event.startDate);

      let startDate = masterStart;
      let endDate = masterEnd;

      if (instanceDate && event.rrule && !event.recurringEventId) {
        const span = calendarSpanDays(masterStart, masterEnd);
        startDate = instanceDate;
        endDate = addCalendarDays(instanceDate, span);
      }

      return {
        title: event.title,
        allDay: true,
        startDate,
        endDate,
        startTime: startTimeDefault,
        endTime: endTimeDefault,
        alertMinutes: event.alertMinutes ?? [],
        contactId: event.contactId ?? "",
        note: event.note ?? "",
        location: event.location ?? "",
        target,
      };
    }

    const startIso = instanceStart ?? event.startAt;
    const start = parseTimestamp(startIso) ?? new Date();
    const end =
      parseTimestamp(event.endAt) ?? new Date(start.getTime() + 3600000);

    return {
      title: event.title,
      allDay: false,
      startDate: toCalendarDateString(start),
      endDate: toCalendarDateString(end),
      startTime: timeFromInstant(startIso, startTimeDefault),
      endTime: timeFromInstant(event.endAt, endTimeDefault),
      alertMinutes: event.alertMinutes ?? [],
      contactId: event.contactId ?? "",
      note: event.note ?? "",
      location: event.location ?? "",
      target,
    };
  }

  const allDay = defaults?.allDay ?? true;
  const startDate = normalizeCalendarDateField(defaults?.startDate) ?? today;
  const endDate = normalizeCalendarDateField(defaults?.endDate) ?? startDate;

  return {
    title: "",
    allDay,
    startDate,
    endDate,
    startTime: startTimeDefault,
    endTime: endTimeDefault,
    alertMinutes: [],
    contactId: "",
    note: "",
    location: "",
    target,
  };
}

function formValuesToInput(
  values: EventFormValues,
  recurrence: RecurrenceFormValues,
): CalendarEventInput {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dtstart = eventDtstart({
    allDay: values.allDay,
    startDate: values.startDate,
    startTime: values.startTime,
  });
  const rrule = formToRrule(recurrence, dtstart);
  // Ignored by PATCH — the target only binds at create time.
  const target = {
    calendarConnectionId:
      values.target === LOCAL_TARGET ? null : values.target,
    syncToGoogle: values.target !== LOCAL_TARGET,
  };

  if (values.allDay) {
    return {
      ...target,
      title: values.title.trim(),
      allDay: true,
      startDate: values.startDate,
      endDate: values.endDate || values.startDate,
      startAt: null,
      endAt: null,
      timeZone,
      rrule,
      alertMinutes: values.alertMinutes.length > 0 ? values.alertMinutes : null,
      contactId: values.contactId || null,
      note: values.note.trim() || null,
      location: values.location.trim() || null,
    };
  }

  const startAt = new Date(`${values.startDate}T${values.startTime}:00`);
  const endAt = new Date(
    `${values.endDate || values.startDate}T${values.endTime}:00`,
  );

  return {
    ...target,
    title: values.title.trim(),
    allDay: false,
    startDate: null,
    endDate: null,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    timeZone,
    rrule,
    alertMinutes: values.alertMinutes.length > 0 ? values.alertMinutes : null,
    contactId: values.contactId || null,
    note: values.note.trim() || null,
    location: values.location.trim() || null,
  };
}

export function recurrenceValuesFromEvent(
  event: CalendarEvent | null,
  defaults?: Partial<CalendarEventInput>,
): RecurrenceFormValues {
  if (event?.rrule) {
    const dtstart =
      event.allDay && event.startDate
        ? new Date(`${event.startDate}T00:00:00`)
        : new Date(event.startAt ?? Date.now());
    return rruleToForm(event.rrule, dtstart);
  }
  if (defaults?.rrule) {
    const dtstart =
      defaults.allDay && defaults.startDate
        ? new Date(`${defaults.startDate}T00:00:00`)
        : new Date(defaults.startAt ?? Date.now());
    return rruleToForm(defaults.rrule, dtstart);
  }
  return defaultRecurrenceFormValues();
}

type EventFormDialogProps = {
  open: boolean;
  event: CalendarEvent | null;
  instanceStart?: string | null;
  defaults?: Partial<CalendarEventInput>;
  dayEvents?: CalendarEvent[];
  isPending?: boolean;
  onClose: () => void;
  onSave: (
    input: CalendarEventInput,
    opts?: RecurrenceMutationOptions,
  ) => Promise<void>;
};

const ALERT_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440, 2880] as const;

const ALERT_LABEL_KEYS: Record<number, string> = {
  0: "form.reminderAtTime",
  5: "form.reminder5m",
  10: "form.reminder10m",
  15: "form.reminder15m",
  30: "form.reminder30m",
  60: "form.reminder1h",
  120: "form.reminder2h",
  1440: "form.reminder1d",
  2880: "form.reminder2d",
};

export function EventFormDialog({
  open,
  event,
  instanceStart,
  defaults,
  dayEvents = [],
  isPending,
  onClose,
  onSave,
}: EventFormDialogProps) {
  const { t } = useTranslation("calendar");
  const { connection } = useCalendarConnection();
  const calendars = connection?.calendars ?? [];
  const defaultTarget = calendars[0]?.id ?? LOCAL_TARGET;
  const [recurrence, setRecurrence] = useState<RecurrenceFormValues>(
    defaultRecurrenceFormValues(),
  );
  const [customRepeat, setCustomRepeat] = useState(false);
  const [extraAlertRow, setExtraAlertRow] = useState(false);
  const [scopeMode, setScopeMode] = useState(false);
  const [pendingInput, setPendingInput] = useState<CalendarEventInput | null>(
    null,
  );

  const needsScope =
    !!event?.rrule && !event.recurringEventId && !!instanceStart;

  const form = useForm({
    defaultValues: eventToFormValues(event, defaults, instanceStart, defaultTarget),
    validators: { onSubmit: eventSchema },
    onSubmit: async ({ value }) => {
      const input = formValuesToInput(value, recurrence);
      if (needsScope) {
        setPendingInput(input);
        setScopeMode(true);
        return;
      }
      await onSave(input);
      onClose();
    },
  });

  async function handleScopeSelect(scope: RecurrenceScope) {
    const opts: RecurrenceMutationOptions = {
      scope,
      instanceStart: instanceStart ?? undefined,
    };
    if (pendingInput) {
      await onSave(pendingInput, opts);
      setPendingInput(null);
      setScopeMode(false);
      onClose();
    }
  }

  useEffect(() => {
    if (open) {
      form.reset(eventToFormValues(event, defaults, instanceStart, defaultTarget));
      const rec = recurrenceValuesFromEvent(event, defaults);
      setRecurrence(rec);
      // Weekly presets and weekly-with-weekdays parse identically, so only interval/until mark an rrule as custom.
      setCustomRepeat(
        rec.enabled && (rec.interval !== 1 || rec.until !== null),
      );
      setExtraAlertRow(false);
      setScopeMode(false);
      setPendingInput(null);
    }
  }, [open, event, defaults, instanceStart, defaultTarget, form]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[min(85vh,680px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {event ? t("form.editEvent") : t("form.newEvent")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("form.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <form.Field name="title">
            {(field) => (
              <div className="space-y-1.5">
                <Input
                  id="event-title"
                  aria-label={t("form.title")}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={t("form.titlePlaceholder")}
                />
                {fieldError(field.state.meta.errors) && (
                  <p className="text-xs text-red-500">
                    {fieldError(field.state.meta.errors)}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="allDay">
            {(field) => (
              <div className="flex items-center gap-3">
                <Label
                  htmlFor="event-all-day"
                  className="w-16 shrink-0 text-xs"
                >
                  {t("form.allDay")}
                </Label>
                <Switch
                  id="event-all-day"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  size="sm"
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => s.values.allDay}>
            {(allDay) => (
              <>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="event-start-date"
                    className="w-16 shrink-0 text-xs"
                  >
                    {t("form.start")}
                  </Label>
                  <div className="flex min-w-0 flex-1 gap-3">
                    {!allDay && (
                      <form.Field name="startTime">
                        {(field) => (
                          <Input
                            type="time"
                            aria-label={t("form.startTime")}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="w-28 shrink-0"
                          />
                        )}
                      </form.Field>
                    )}
                    <form.Field name="startDate">
                      {(field) => (
                        <div className="min-w-0 flex-1">
                          <DatePicker
                            id="event-start-date"
                            value={field.state.value}
                            placeholder={t("form.pickDate")}
                            onChange={(value) => {
                              const next = value ?? todayCalendarDate();
                              form.setFieldValue(
                                "endDate",
                                endDateForStart(
                                  field.state.value,
                                  form.getFieldValue("endDate"),
                                  next,
                                ),
                              );
                              field.handleChange(next);
                            }}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="event-end-date"
                    className="w-16 shrink-0 text-xs"
                  >
                    {t("form.end")}
                  </Label>
                  <div className="flex min-w-0 flex-1 gap-3">
                    {!allDay && (
                      <form.Field name="endTime">
                        {(field) => (
                          <Input
                            type="time"
                            aria-label={t("form.endTime")}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="w-28 shrink-0"
                          />
                        )}
                      </form.Field>
                    )}
                    <form.Field name="endDate">
                      {(field) => (
                        <div className="min-w-0 flex-1">
                          <DatePicker
                            id="event-end-date"
                            value={field.state.value}
                            placeholder={t("form.pickDate")}
                            onChange={(value) =>
                              field.handleChange(
                                clampEndDate(
                                  form.getFieldValue("startDate"),
                                  value ?? todayCalendarDate(),
                                ),
                              )
                            }
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                </div>

                {!allDay && (
                  <form.Subscribe
                    selector={(s) => ({
                      startDate: s.values.startDate,
                      startTime: s.values.startTime,
                      endTime: s.values.endTime,
                    })}
                  >
                    {({ startDate, startTime, endTime }) => (
                      <TimeConflictNotice
                        day={startDate}
                        events={dayEvents}
                        excludeId={event?.id}
                        startTime={startTime}
                        endTime={endTime}
                      />
                    )}
                  </form.Subscribe>
                )}

                <form.Field name="endTime">
                  {(field) =>
                    fieldError(field.state.meta.errors) ? (
                      <p className="text-xs text-danger">
                        {fieldError(field.state.meta.errors)}
                      </p>
                    ) : null
                  }
                </form.Field>
              </>
            )}
          </form.Subscribe>

          {!event?.recurringEventId ? (
            <RecurrenceFields
              value={recurrence}
              custom={customRepeat}
              onChange={(next, custom) => {
                setRecurrence(next);
                setCustomRepeat(custom);
              }}
            />
          ) : null}

          <form.Field name="alertMinutes">
            {(field) => {
              const alerts = field.state.value;
              const rows: (number | null)[] =
                alerts.length === 0
                  ? [null]
                  : extraAlertRow
                    ? [...alerts, null]
                    : [...alerts];

              function setRow(row: number | null, next: number | null) {
                if (row === null) setExtraAlertRow(false);
                const rest =
                  row === null ? alerts : alerts.filter((m) => m !== row);
                field.handleChange(
                  next === null
                    ? rest
                    : [...new Set([...rest, next])].sort((a, b) => a - b),
                );
              }

              return (
                <div className="flex gap-3">
                  <Label className="w-16 shrink-0 pt-3 text-xs">
                    {t("form.alert")}
                  </Label>
                  <div className="min-w-0 flex-1 space-y-2">
                    {rows.map((row, index) => (
                      <div
                        key={row ?? "new"}
                        className="group flex items-center gap-1.5"
                      >
                        <Select
                          value={row === null ? "none" : String(row)}
                          onValueChange={(next) =>
                            setRow(row, next === "none" ? null : Number(next))
                          }
                        >
                          <SelectTrigger className="w-3/4 [&>span]:flex-1">
                            <Bell className="mr-2 size-3.5 shrink-0 opacity-60" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {t("form.reminderNone")}
                            </SelectItem>
                            {ALERT_OPTIONS.map((minutes) => (
                              <SelectItem key={minutes} value={String(minutes)}>
                                {t(ALERT_LABEL_KEYS[minutes])}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {index === rows.length - 1 && row !== null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("form.addAlert")}
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => setExtraAlertRow(true)}
                          >
                            <Plus className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          </form.Field>

          <form.Field name="contactId">
            {(field) => (
              <EventAttendeePicker
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          {calendars.length > 0 && (
            <form.Field name="target">
              {(field) => (
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="event-target"
                    className="w-16 shrink-0 text-xs"
                  >
                    {t("form.calendar")}
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    disabled={!!event}
                  >
                    <SelectTrigger
                      id="event-target"
                      className="min-w-0 flex-1 [&>span]:flex-1"
                    >
                      <CalendarDays className="mr-2 size-3.5 shrink-0 opacity-60" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LOCAL_TARGET}>
                        {t("form.calendarLocal")}
                      </SelectItem>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          {calendar.calendarName ??
                            calendar.accountEmail ??
                            calendar.calendarId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          )}

          <form.Field name="location">
            {(field) => (
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 opacity-60" />
                <Input
                  id="event-location"
                  aria-label={t("form.location")}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t("form.locationPlaceholder")}
                  className="pl-10"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="note">
            {(field) => (
              <div className="relative">
                <AlignLeft className="pointer-events-none absolute left-4 top-3.5 size-3.5 opacity-60" />
                <Textarea
                  id="event-note"
                  aria-label={t("form.note")}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t("form.notePlaceholder")}
                  rows={3}
                  className="pl-10"
                />
              </div>
            )}
          </form.Field>

          </div>

          <div className="drawer-footer">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("form.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            >
              {isPending ? t("form.saving") : t("form.save")}
            </button>
          </div>
        </form>
      </DialogContent>
      <RecurrenceScopeDialog
        open={scopeMode}
        mode="edit"
        onClose={() => setScopeMode(false)}
        onSelect={(scope) => void handleScopeSelect(scope)}
      />
    </Dialog>
  );
}
