/** Canonical plan entitlements (C-321). Live rows are enforced; soon rows are marketing-only. */

export type PlanId = "free" | "mana" | "aether";
export type PaidPlanId = "mana" | "aether";
export type ActionBucket = "ai";
export type DeploymentMode = "cloud" | "self-hosted";

/** Paid annual plans bill for 10 months (2 months free). */
export const ANNUAL_FREE_MONTHS = 2;

/** Canonical THB list prices — Stripe prices should match these amounts. */
export const PLAN_PRICING_THB: Record<
  PaidPlanId,
  { monthly: number; annual: number }
> = {
  mana: { monthly: 290, annual: 290 * 10 },
  aether: { monthly: 890, annual: 890 * 10 },
};

export const ACTION_CAPS: Record<PlanId, number> = {
  free: 25,
  mana: 120,
  aether: 1100,
};

/** Active (non-deleted, non-archived) project hard caps. `null` = unlimited. */
export const PROJECT_CAPS: Record<PlanId, number | null> = {
  free: 1,
  mana: 10,
  aether: null,
};

const GB = 1024 * 1024 * 1024;

/** Storage hard caps — must match the storage matrix copy (1/10/50 GB). */
export const STORAGE_CAPS_BYTES: Record<PlanId, number> = {
  free: 1 * GB,
  mana: 10 * GB,
  aether: 50 * GB,
};

/** Documents emailed to clients per calendar month. `null` = unlimited. */
export const DOCS_SENT_CAPS: Record<PlanId, number | null> = {
  free: 10,
  mana: null,
  aether: null,
};

/** Real bank-side slip verifications (Thunder Solution) per calendar month. `null` = unlimited. 0 = not available on this plan. */
export const SLIP_VERIFY_CAPS: Record<PlanId, number | null> = {
  free: 0,
  mana: 30,
  aether: null,
};

/** Google Calendar sync availability (free tier included; multi-calendar sync is paid-only). */
export const CALENDAR_SYNC_ALLOWED: Record<PlanId, boolean> = {
  free: true,
  mana: true,
  aether: true,
};

/** Synced Google calendars per user, by plan. */
export const CALENDAR_SYNC_MAX_CALENDARS: Record<PlanId, number> = {
  free: 1,
  mana: 5,
  aether: 10,
};

export function getCoreEntitlements(plan: PlanId, mode: DeploymentMode = "cloud") {
  const selfHosted = mode === "self-hosted";
  return {
    projects: selfHosted ? null : PROJECT_CAPS[plan],
    storageBytes: selfHosted ? null : STORAGE_CAPS_BYTES[plan],
    docsSent: selfHosted ? null : DOCS_SENT_CAPS[plan],
    calendars: selfHosted ? null : CALENDAR_SYNC_MAX_CALENDARS[plan],
    hideBranding: selfHosted || plan !== "free",
  };
}

export type PrivilegeStatus = "live" | "soon";

/** Cell display kind for the compare matrix. */
export type PrivilegeCell =
  | { kind: "count"; value: number }
  | { kind: "unlimited" }
  | { kind: "text"; key: string }
  | { kind: "locked" }
  | { kind: "none" };

export type PrivilegeRow = {
  id: string;
  status: PrivilegeStatus;
  /** Plans whose cell is "soon" even though the row overall is live (e.g. free tier works today, paid upsell doesn't yet). */
  soonPlans?: PlanId[];
  cells: Record<PlanId, PrivilegeCell>;
};

/**
 * Product privilege matrix. Numbers for live hard caps must match ACTION_CAPS / PROJECT_CAPS.
 * `soon` rows must not be claimed as enforced in UI copy.
 */
export const PRIVILEGE_MATRIX: PrivilegeRow[] = [
  {
    id: "projects",
    status: "live",
    cells: {
      free: { kind: "count", value: PROJECT_CAPS.free! },
      mana: { kind: "count", value: PROJECT_CAPS.mana! },
      aether: { kind: "unlimited" },
    },
  },
  {
    id: "ai",
    status: "live",
    cells: {
      free: { kind: "count", value: ACTION_CAPS.free },
      mana: { kind: "count", value: ACTION_CAPS.mana },
      aether: { kind: "count", value: ACTION_CAPS.aether },
    },
  },
  {
    id: "contacts",
    status: "live",
    cells: {
      free: { kind: "unlimited" },
      mana: { kind: "unlimited" },
      aether: { kind: "unlimited" },
    },
  },
  {
    id: "coreTools",
    status: "live",
    cells: {
      free: { kind: "text", key: "included" },
      mana: { kind: "text", key: "included" },
      aether: { kind: "text", key: "included" },
    },
  },
  {
    id: "storage",
    status: "live",
    cells: {
      free: { kind: "text", key: "storageFree" },
      mana: { kind: "text", key: "storageMana" },
      aether: { kind: "text", key: "storageAether" },
    },
  },
  {
    id: "docsSent",
    status: "live",
    cells: {
      free: { kind: "count", value: DOCS_SENT_CAPS.free! },
      mana: { kind: "unlimited" },
      aether: { kind: "unlimited" },
    },
  },
  {
    id: "slipVerify",
    status: "live",
    cells: {
      free: { kind: "text", key: "standard" },
      mana: { kind: "count", value: SLIP_VERIFY_CAPS.mana! },
      aether: { kind: "unlimited" },
    },
  },
  {
    id: "calendarSync",
    status: "live",
    cells: {
      free: { kind: "count", value: CALENDAR_SYNC_MAX_CALENDARS.free },
      mana: { kind: "count", value: CALENDAR_SYNC_MAX_CALENDARS.mana },
      aether: { kind: "count", value: CALENDAR_SYNC_MAX_CALENDARS.aether },
    },
  },
  {
    id: "branding",
    status: "live",
    cells: {
      free: { kind: "text", key: "brandingOn" },
      mana: { kind: "text", key: "brandingOff" },
      aether: { kind: "text", key: "brandingOff" },
    },
  },
];

/** Live highlight bullets for paid plan cards (projects + AI). */
export const PAID_PLAN_HIGHLIGHT_IDS = [
  "projects",
  "ai",
  "coreTools",
] as const;

export function formatPrivilegeCount(value: number | null): string {
  if (value === null) return "∞";
  return new Intl.NumberFormat("en-US").format(value);
}
