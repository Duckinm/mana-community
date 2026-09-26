import { ACTION_CAPS, getCoreEntitlements, type PlanId } from "@mana/db/plan-entitlements";
import { projects, users } from "@mana/db";
import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@api/db";
import { AppError } from "@api/lib/errors";
import { env } from "@api/env";

export { PROJECT_CAPS, ACTION_CAPS } from "@mana/db/plan-entitlements";

const PLAN_DISPLAY: Record<PlanId, string> = {
  free: "Free",
  mana: "Mana",
  aether: "Aether",
};

export function formatProjectCap(cap: number | null): string {
  return cap === null ? "unlimited" : String(cap);
}

export function buildProjectLimitToolError(plan: PlanId, used: number, cap: number) {
  const planName = PLAN_DISPLAY[plan];
  return {
    error: "PLAN_LIMIT_PROJECTS",
    message: `Active project limit reached (${used}/${cap} on ${planName}). Archive or delete a project, or upgrade — Mana allows 10, Aether is unlimited.`,
    plan,
    used,
    cap,
  };
}

export function buildAiActionLimitToolError(plan: PlanId, used: number, cap: number) {
  const planName = PLAN_DISPLAY[plan];
  return {
    error: "PLAN_LIMIT_AI_ACTIONS",
    message: `AI Action limit reached (${used}/${cap} on ${planName}). It resets at the start of next month.`,
    plan,
    used,
    cap,
  };
}

export async function buildPlanContextLine(userId: string, plan: PlanId): Promise<string> {
  if (env.DEPLOYMENT_MODE === "self-hosted") {
    return "Self-hosted MANA: core features have no subscription caps. AI requires a configured provider; call get_plan_usage for AI availability and limits.";
  }
  const projectsEntitlement = await getProjectEntitlement(userId, plan);
  const cap = ACTION_CAPS[plan];
  const projectCap = formatProjectCap(projectsEntitlement.cap);
  return [
    `User plan: ${PLAN_DISPLAY[plan]}.`,
    `Active projects: ${projectsEntitlement.used}/${projectCap}.`,
    `Plan caps (canonical): Free 1 active project; Mana 10; Aether unlimited.`,
    `AI Actions/month: ${cap} on ${PLAN_DISPLAY[plan]}.`,
    `When a tool returns PLAN_LIMIT_PROJECTS, quote the exact used/cap from the tool result — never invent a limit.`,
    `Call get_plan_usage before explaining plan limits.`,
  ].join(" ");
}

export async function countActiveProjects(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        eq(projects.archived, false),
      ),
    );
  return row?.value ?? 0;
}

export async function getProjectEntitlement(userId: string, plan: PlanId) {
  const used = await countActiveProjects(userId);
  return { used, cap: getCoreEntitlements(plan, env.DEPLOYMENT_MODE).projects };
}

/**
 * Downgrade enforcement: archives active projects beyond the plan cap, keeping the
 * most recently updated ones. Archived projects stay cap-gated on unarchive, so they
 * only come back after an upgrade. Idempotent — safe on every subscription sync.
 */
export async function reconcileProjectCap(
  userId: string,
  plan: PlanId,
): Promise<number> {
  const cap = getCoreEntitlements(plan, env.DEPLOYMENT_MODE).projects;
  if (cap === null) return 0;
  const excess = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        eq(projects.archived, false),
      ),
    )
    .orderBy(desc(projects.updatedAt))
    .offset(cap);
  if (excess.length === 0) return 0;
  await db
    .update(projects)
    .set({ archived: true, planArchivedAt: new Date(), updatedAt: new Date() })
    .where(inArray(projects.id, excess.map((p) => p.id)));
  return excess.length;
}

/** Projects auto-archived by a downgrade and not yet unarchived — drives the "already applied" notice. */
export async function countPlanArchivedProjects(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.archived, true),
        isNull(projects.deletedAt),
        isNotNull(projects.planArchivedAt),
      ),
    );
  return row?.value ?? 0;
}

/** Unarchives the downgrade-archived projects the current plan has room for. */
export async function restorePlanArchivedProjects(
  userId: string,
  plan: PlanId,
): Promise<number> {
  const cap = getCoreEntitlements(plan, env.DEPLOYMENT_MODE).projects;
  const room = cap === null ? null : cap - (await countActiveProjects(userId));
  if (room !== null && room <= 0) return 0;

  const query = db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        eq(projects.archived, true),
        isNotNull(projects.planArchivedAt),
      ),
    )
    .orderBy(desc(projects.updatedAt));
  const restorable = room === null ? await query : await query.limit(room);
  if (restorable.length === 0) return 0;

  await db
    .update(projects)
    .set({ archived: false, planArchivedAt: null, updatedAt: new Date() })
    .where(inArray(projects.id, restorable.map((p) => p.id)));
  return restorable.length;
}

/** Blocks create/duplicate/restore when the plan's active-project hard cap is reached. */
export async function assertProjectCreateAllowed(userId: string): Promise<void> {
  const [user] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);

  const plan = user.plan as PlanId;
  const cap = getCoreEntitlements(plan, env.DEPLOYMENT_MODE).projects;
  if (cap === null) return;

  const used = await countActiveProjects(userId);
  if (used >= cap) {
    throw new AppError("PLAN_LIMIT_PROJECTS", 403);
  }
}
