import { db } from '@api/db'
import { feedback, type FeedbackSeverity, type FeedbackType } from '@mana/db'
import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm'
import { env } from '@api/env'
import { parseJsonObject } from '@api/modules/ai/service'

const OPEN_STATUSES = ['new', 'planned', 'in_progress'] as const
const SEVERITIES: FeedbackSeverity[] = ['critical', 'warning', 'info']
const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'idea', 'question', 'other']
const FIBONACCI_SCORES = [1, 2, 3, 5, 8, 13, 21]
const TRASH_SCORES = [-1, -2, -3]
// ponytail: bounds malformed model output while leaving room for the ticket's 100+ story case
const MAX_SPLIT_PARTS = 200

interface AiPart {
  message?: unknown
  type?: unknown
  severity?: unknown
  note?: unknown
  score?: unknown
  encounters?: unknown
  summary?: unknown
  estimate?: unknown
}

interface AiItem {
  id?: unknown
  parts?: unknown
}

interface PlannedPart {
  message: string
  type: FeedbackType
  severity: FeedbackSeverity
  aiNote: string | null
  score: number | null
  encounterCount: number | null
  solutionSummary: string | null
  timeEstimate: string | null
}

interface PlanningRow {
  id: string
  type: FeedbackType
  message: string
  parentFeedbackId: string | null
  splitState: 'atomic' | 'compound' | null
}

function planPart(part: AiPart, fallbackType: FeedbackType): PlannedPart | null {
  if (typeof part.message !== 'string' || !part.message.trim()) return null
  const severity = SEVERITIES.includes(part.severity as FeedbackSeverity)
    ? (part.severity as FeedbackSeverity)
    : 'info'
  const score =
    typeof part.score === 'number' &&
    (FIBONACCI_SCORES.includes(part.score) || TRASH_SCORES.includes(part.score))
      ? part.score
      : null
  const encounterCount =
    typeof part.encounters === 'number' &&
    Number.isInteger(part.encounters) &&
    part.encounters >= 0
      ? part.encounters
      : null

  return {
    message: part.message.trim().slice(0, 4000),
    type: FEEDBACK_TYPES.includes(part.type as FeedbackType)
      ? (part.type as FeedbackType)
      : fallbackType,
    severity,
    aiNote: typeof part.note === 'string' ? part.note.slice(0, 300) : null,
    score,
    encounterCount,
    solutionSummary: typeof part.summary === 'string' ? part.summary.slice(0, 300) : null,
    timeEstimate: typeof part.estimate === 'string' ? part.estimate.slice(0, 50) : null,
  }
}

export function planFeedbackPrioritization(rows: PlanningRow[], items: AiItem[]) {
  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const plannedIds = new Set<string>()

  return items.flatMap((item) => {
    if (typeof item.id !== 'string' || !Array.isArray(item.parts)) return []
    const source = rowsById.get(item.id)
    if (!source || source.splitState === 'compound' || plannedIds.has(source.id)) return []

    const seen = new Set<string>()
    const parts = item.parts.slice(0, MAX_SPLIT_PARTS).flatMap((part) => {
      if (!part || typeof part !== 'object') return []
      const planned = planPart(part as AiPart, source.type)
      if (!planned) return []
      const key = planned.message.toLowerCase()
      if (seen.has(key)) return []
      seen.add(key)
      return [planned]
    })
    if (parts.length === 0) return []
    plannedIds.add(source.id)

    const split = source.splitState === null && source.parentFeedbackId === null && parts.length > 1
    return [{ source, parts: split ? parts : [{ ...parts[0], message: source.message }], split }]
  })
}

export async function prioritizeFeedbackForUser(userId: string) {
  const open = await db
    .select()
    .from(feedback)
    .where(
      and(
        eq(feedback.userId, userId),
        inArray(feedback.status, [...OPEN_STATUSES]),
        or(isNull(feedback.splitState), ne(feedback.splitState, 'compound')),
      ),
    )

  if (open.length === 0) return { updated: 0, created: 0, split: 0 }

  const prompt = [
    'You are triaging product feedback for MANA, a freelance business platform.',
    'First divide each submission into atomic parts:',
    '- Split only independent user stories that could be actioned, prioritized, or completed separately.',
    '- Keep reproduction details, acceptance criteria, and steps for one story together.',
    '- Each part must be standalone and retain the user intent; do not invent requirements.',
    '- If splitAllowed is false, return exactly one part even if the message appears compound.',
    '- If the submission is already atomic or irrelevant, return exactly one part.',
    '',
    'For every part:',
    '- type: "bug", "idea", "question", or "other" based on that atomic part, not the parent submission.',
    '- severity: "critical" = blocking, data loss, security, or broken money flows (invoices, accounting); "warning" = broken or degraded but has a workaround; "info" = idea, question, or cosmetic. Multiple similar reports push severity up.',
    '- score: Fibonacci effort to fix, one of 1, 2, 3, 5, 8, 13, 21 (higher = harder).',
    '- encounters: how many OTHER atomic parts in this batch describe the same or a very similar case.',
    '- summary: barebone fix suggestion, max 3 short lines.',
    '- estimate: rough time to complete, e.g. "3 hours", "2 days".',
    '- note: reason, under 100 characters.',
    '',
    'Irrelevant parts — pure trash talk, insults, or venting with no actionable information:',
    '- score: -1 useless but harmless, -2 rude, -3 abusive. No Fibonacci score.',
    '- severity "info", note starting with "irrelevant:", summary and estimate null.',
    '- A rude message that still points at a real problem is NOT irrelevant — score it normally.',
    '',
    'Submissions (JSON):',
    JSON.stringify(
      open.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        message: row.message,
        pagePath: row.pagePath,
        createdAt: row.createdAt.toISOString(),
        splitAllowed: row.splitState === null && row.parentFeedbackId === null,
      })),
    ),
    '',
    'Respond with ONLY a JSON array (no markdown), one entry per submission:',
    '{ "id": string, "parts": [{ "message": string, "type": "bug"|"idea"|"question"|"other", "severity": "critical"|"warning"|"info", "note": string, "score": number, "encounters": number, "summary": string|null, "estimate": string|null }] }',
    'Be terse everywhere. No filler words.',
  ].join('\n')

  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set')

  // ponytail: plain fetch, no SDK — OpenRouter speaks the OpenAI chat-completions shape
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-5.5',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status}): ${await response.text()}`)
  }
  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const text = completion.choices?.[0]?.message?.content ?? '[]'
  const items = parseJsonObject<AiItem[]>(text, /\[[\s\S]*\]/, 'feedback prioritization')
  const plans = planFeedbackPrioritization(open, items)
  const now = new Date()
  let updated = 0
  let created = 0
  let split = 0

  await db.transaction(async (tx) => {
    for (const plan of plans) {
      if (plan.split) {
        const [parent] = await tx
          .update(feedback)
          .set({
            splitState: 'compound',
            splitPartCount: plan.parts.length,
            aiNote: `Split into ${plan.parts.length} actionable items`,
            lastPrioritizedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(feedback.id, plan.source.id),
              eq(feedback.userId, userId),
              isNull(feedback.parentFeedbackId),
              isNull(feedback.splitState),
            ),
          )
          .returning()
        if (!parent) continue

        await tx.insert(feedback).values(
          plan.parts.map((part) => ({
            userId: parent.userId,
            parentFeedbackId: parent.id,
            splitState: 'atomic' as const,
            splitPartCount: plan.parts.length,
            type: part.type,
            message: part.message,
            pagePath: parent.pagePath,
            status: parent.status,
            severity: part.severity,
            source: parent.source,
            aiNote: part.aiNote,
            score: part.score,
            encounterCount: part.encounterCount,
            solutionSummary: part.solutionSummary,
            timeEstimate: part.timeEstimate,
            lastPrioritizedAt: now,
            createdAt: parent.createdAt,
            updatedAt: now,
          })),
        )
        updated++
        created += plan.parts.length
        split++
        continue
      }

      const [part] = plan.parts
      const [row] = await tx
        .update(feedback)
        .set({
          splitState: 'atomic',
          severity: part.severity,
          aiNote: part.aiNote,
          score: part.score,
          encounterCount: part.encounterCount,
          solutionSummary: part.solutionSummary,
          timeEstimate: part.timeEstimate,
          lastPrioritizedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(feedback.id, plan.source.id),
            eq(feedback.userId, userId),
            or(isNull(feedback.splitState), eq(feedback.splitState, 'atomic')),
          ),
        )
        .returning({ id: feedback.id })
      if (row) updated++
    }
  })

  return { updated, created, split }
}

export async function prioritizeAllFeedback() {
  const userRows = await db
    .selectDistinct({ userId: feedback.userId })
    .from(feedback)
    .where(
      and(
        inArray(feedback.status, [...OPEN_STATUSES]),
        or(isNull(feedback.splitState), ne(feedback.splitState, 'compound')),
      ),
    )
  let updated = 0
  let created = 0
  let split = 0
  for (const { userId } of userRows) {
    const result = await prioritizeFeedbackForUser(userId)
    updated += result.updated
    created += result.created
    split += result.split
  }
  return { users: userRows.length, updated, created, split }
}
