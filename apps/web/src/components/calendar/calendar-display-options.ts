export const CALENDAR_DISPLAY_OPTION_IDS = [
  "native",
  "google",
  "tasks",
  "milestones",
  "documents",
  "dueSoon",
  "overdue",
  "recurring",
] as const;

export type CalendarDisplayOption = (typeof CALENDAR_DISPLAY_OPTION_IDS)[number];
export type CalendarDisplayOptions = Record<CalendarDisplayOption, boolean>;

export const DEFAULT_CALENDAR_DISPLAY_OPTIONS: CalendarDisplayOptions = {
  native: true,
  google: true,
  tasks: true,
  milestones: true,
  documents: true,
  dueSoon: true,
  overdue: true,
  recurring: true,
};

export function isCalendarEventVisible(
  event: { source?: string | null; accountEmail?: string | null },
  options: CalendarDisplayOptions,
) {
  return options[event.source === "google" || event.accountEmail ? "google" : "native"];
}

export function isCalendarOverlayVisible(
  overlay: {
    kind: "milestone" | "document";
    urgency: "normal" | "dueSoon" | "overdue" | "expired" | null;
    documentDateKind: "invoiceDue" | "quoteExpiry" | "recurringGeneration" | null;
  },
  options: CalendarDisplayOptions,
) {
  if (overlay.kind === "milestone") return options.milestones;
  if (overlay.documentDateKind === "recurringGeneration") return options.recurring;
  if (overlay.urgency === "dueSoon") return options.dueSoon;
  if (overlay.urgency === "overdue" || overlay.urgency === "expired") return options.overdue;
  return options.documents;
}
