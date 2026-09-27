import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ToolUseBlock, ContentBlock, ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages/messages.js'
import { db } from '@api/db'
import { users, chatMessages, chatSessions, documents, projects } from '@mana/db'
import { asc, count, eq, sql, and, lt, isNull } from 'drizzle-orm'
import { getCashFlowForecast } from '@api/modules/accounting/service'
import { mcpToolDefinitions, executeToolCall } from '@api/utils/mcp-tools'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'
import { displayRowsFor, type DisplayRow } from '@api/utils/mcp-tools/display'
import { env } from '@api/env'
import { todayCalendarDate } from '@api/lib/calendar-date'
import { claimAiAction } from '@api/modules/billing/usage'
import { assertAiConfigured, trackedCreate, trackedStream } from '@api/modules/ai/client'
import { settleAiAction } from '@api/modules/chat/ai-action'
import { extractImageText } from '@api/modules/chat/ocr'
import { formatThaiGlossary } from '@api/modules/chat/thai-glossary'
import { verifySessionOwnership } from '@api/modules/chat/sessions'

// Per-action cost bounds (C-409): one chat Action must have a bounded worst case,
// so one request cannot keep spending provider tokens indefinitely.
const MAX_TOOL_ROUNDS = 8
const MAX_TOOL_RESULT_CHARS = 16_000
const MAX_HISTORY_MESSAGE_CHARS = 8_000

type ChatRow = typeof chatMessages.$inferSelect

function boundedToolResult(result: unknown): string {
  const json = JSON.stringify(result)
  return json.length > MAX_TOOL_RESULT_CHARS
    ? `${json.slice(0, MAX_TOOL_RESULT_CHARS)}…[truncated]`
    : json
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

function uiActionFromToolResult(toolName: string, result: unknown): Record<string, unknown> | null {
  if (toolName !== 'open_view' || !result || typeof result !== 'object') return null
  const row = result as Record<string, unknown>
  if (!row.ok || !row.uiAction || typeof row.uiAction !== 'object') return null
  const action = row.uiAction as Record<string, unknown>
  if (action.action !== 'open_overlay') return null
  return { type: 'ui_action', ...action }
}

async function buildNudgeContext(userId: string): Promise<string | null> {
  const today = todayCalendarDate()
  const staleThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const [[overdueRow], [staleRow], forecast] = await Promise.all([
    db.select({ n: count() }).from(documents).where(
      and(
        eq(documents.userId, userId),
        eq(documents.status, 'published'),
        isNull(documents.paidAt),
        isNull(documents.deletedAt),
        lt(documents.dueDate, today),
      )
    ),
    db.select({ n: count() }).from(projects).where(
      and(
        eq(projects.userId, userId),
        eq(projects.archived, false),
        isNull(projects.deletedAt),
        lt(projects.updatedAt, staleThreshold),
      )
    ),
    getCashFlowForecast(userId),
  ])

  const overdueCount = Number(overdueRow?.n ?? 0)
  const staleCount = Number(staleRow?.n ?? 0)
  const { projectedNet, forecastMonth } = forecast

  const lines: string[] = []
  if (overdueCount > 0) lines.push(`- ${overdueCount} overdue unpaid invoice${overdueCount > 1 ? 's' : ''}`)
  if (staleCount > 0) lines.push(`- ${staleCount} active project${staleCount > 1 ? 's' : ''} with no activity in 14+ days`)
  lines.push(`- Projected net cash flow for ${forecastMonth}: ${projectedNet >= 0 ? '+' : ''}${(projectedNet / 100).toFixed(0)} (in base currency cents ÷ 100)`)

  if (overdueCount === 0 && staleCount === 0) return null

  return [
    'PROACTIVE NUDGE CONTEXT (session just opened — greet the user and briefly flag these items, then ask how you can help):',
    ...lines,
  ].join('\n')
}

async function generateSessionTitle(userId: string, sessionId: string, firstMessage: string, locale: ChatLocale) {
  try {
    const languageHint = locale === 'th'
      ? 'Write the title in Thai.'
      : 'Write the title in English.'
    const response = await trackedCreate(userId, {
      model: env.AI_MODEL,
      // Thai runs several tokens per word, so 20 clipped titles mid-word.
      max_tokens: 48,
      // A reasoning model spends the whole budget thinking and returns no text block at all.
      messages: [
        {
          role: 'user',
          content: `Generate a 3-5 word title for a chat that starts with: "${firstMessage}"\n${languageHint}\nReply with only the title, no punctuation, no quotes.`,
        },
      ],
    })

    const titleBlock = response.content[0]
    if (titleBlock?.type !== 'text') return

    const title = titleBlock.text.trim()
    await db
      .update(chatSessions)
      .set({ title, titleGeneratedAt: sql`NOW()`, updatedAt: sql`NOW()` })
      .where(eq(chatSessions.id, sessionId))
  } catch (err) {
    console.error('[chat] title generation failed:', err)
  }
}

type FileParam = { name: string; mediaType: string; data: string; isImage: boolean }

async function buildUserContent(
  message: string,
  files?: FileParam[],
): Promise<string | (ImageBlockParam | TextBlockParam)[]> {
  if (!files || files.length === 0) return message

  const blocks: (ImageBlockParam | TextBlockParam)[] = []

  for (const f of files) {
    if (f.isImage && f.mediaType.startsWith('image/')) {
      // An image block is re-sent on every tool round of the turn, and the agent model is
      // a poor reader of Thai documents. Read it once here and send the agent text instead.
      const extracted = await extractImageText(f.data)
      if (extracted) {
        blocks.push({ type: 'text', text: `[Image: ${f.name}]\n${extracted}` })
        continue
      }
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: f.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: f.data,
        },
      })
    } else if (f.mediaType === 'text/plain') {
      try {
        const decoded = Buffer.from(f.data, 'base64').toString('utf-8')
        blocks.push({ type: 'text', text: `[File: ${f.name}]\n${decoded}` })
      } catch {
        blocks.push({ type: 'text', text: `[File attached: ${f.name}]` })
      }
    } else {
      blocks.push({ type: 'text', text: `[File attached: ${f.name} (${f.mediaType})]` })
    }
  }

  blocks.push({ type: 'text', text: message })
  return blocks
}

type ChatLocale = 'en' | 'th'

function resolveChatLocale(locale?: string): ChatLocale {
  return locale === 'th' ? 'th' : 'en'
}

function chatLocaleInstruction(locale: ChatLocale): string {
  if (locale === 'th') {
    return `The user interface is set to Thai. Always respond in Thai (ภาษาไทย) unless the user explicitly writes in another language or asks you to switch. ${formatThaiGlossary()}`
  }
  return 'Respond in English unless the user explicitly writes in another language or asks you to switch.'
}

interface SystemPromptParams {
  userName: string
  locale: ChatLocale
  tone: string | null
  nudgeContext: string | null
  communityContext: string | null
  fileCount: number
}

function buildSystemPrompt(params: SystemPromptParams): string {
  const { userName, locale, tone, nudgeContext, communityContext, fileCount } = params

  const parts = [
    `You are an AI assistant for ${userName}'s freelance business on MANA.`,
    `You have access to their projects, tasks, contacts, and finances via tools.`,
    `Use tools only when you need real data to answer the user's question — not for greetings or general advice.`,
    `When using tools: never narrate the process in your reply (no "fetching…", "found it", "updating now", "one moment"). The UI already shows tool progress. Call tools silently, then respond with only the outcome the user asked for.`,
    `After tool calls finish, always give a concise user-facing answer — never leave the reply empty.`,
    `Never tell the user something was created, updated, sent, or deleted unless you actually called the corresponding write tool in this turn and its result confirms success. Looking up a contact or project (search_contacts, get_projects, etc.) does not create anything. If you have enough information to act, call the write tool before confirming — do not describe an action as done without calling it.`,
    `When showing lists or summaries (invoices, projects, finances), rely on read tools — the UI renders inline widget cards automatically.`,
    `When the user asks to see, open, show, or edit a specific entity in detail, call open_view to open a popup preview in chat.`,
    `Project fields: objective = short subtitle under the project name; description = details in the Overview section. Use update_project description for คำอธิบาย/รายละเอียด.`,
    `create_project: only name is required. Call it immediately when the user gives a project name — do not ask for client, dates, description, or color unless they offered them.`,
    chatLocaleInstruction(locale),
    `Response tone: ${tone ?? 'balanced'}.`,
    `Today's date: ${todayCalendarDate()} — Buddhist era พ.ศ. ${new Date().getFullYear() + 543}.`,
    // The model reliably knows CE + 543 and still writes a stale พ.ศ. year when a
    // date is a few steps of arithmetic away, which put a Thai tax deadline two
    // years in the past during the persona runs.
    `Thai dates: convert every year with CE + 543 and state the พ.ศ. year you computed. A deadline that has already passed is always an arithmetic error — recheck before answering.`,
  ]

  if (nudgeContext) parts.push(nudgeContext)
  if (communityContext) parts.push(communityContext)
  if (fileCount > 0) parts.push(`The user has attached ${fileCount} file(s). Analyse and reference them in your response.`)

  return parts.join('\n')
}

export async function buildChatStream(
  userId: string,
  sessionId: string,
  message: string,
  files?: FileParam[],
  locale?: string,
  signal?: AbortSignal,
): Promise<ReadableStream> {
  assertAiConfigured()
  const chatLocale = resolveChatLocale(locale)
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user) throw new Error('User not found')

  const owned = await verifySessionOwnership(userId, sessionId)
  if (!owned) throw new Error('Session not found')

  await claimAiAction(userId)

  let historyMessages: MessageParam[] = []
  if (user.aiMemory) {
    const history = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(20)

    historyMessages = history.map((m: ChatRow) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.length > MAX_HISTORY_MESSAGE_CHARS
        ? `${m.content.slice(0, MAX_HISTORY_MESSAGE_CHARS)}…[truncated]`
        : m.content,
    }))
  }

  // Check whether this session needs a title generated (first message in session)
  const [existingMessage] = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .limit(1)

  const isFirstMessage = !existingMessage

  const [sessionRow] = await db
    .select({ titleGeneratedAt: chatSessions.titleGeneratedAt })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))

  const needsTitleGeneration = isFirstMessage && !sessionRow?.titleGeneratedAt

  const nudgeContext = isFirstMessage ? await buildNudgeContext(userId) : null
  const communityContext = 'MANA Community has no subscription limits. AI and integrations use the administrator’s configured provider. Call get_usage for resource usage.'

  const systemPrompt = buildSystemPrompt({
    userName: user.name,
    locale: chatLocale,
    tone: user.aiTone,
    nudgeContext,
    communityContext,
    fileCount: files?.length ?? 0,
  })

  const messages: MessageParam[] = [
    ...historyMessages,
    { role: 'user', content: await buildUserContent(message, files) },
  ]

  // Local-LLM mode only: hide user-disabled tools to shrink the ~8.5k-token
  // catalog that dominates cold prompt eval (C-353). Real Claude always gets all tools.
  const disabledAiTools = env.ANTHROPIC_BASE_URL && user.disabledAiTools?.length
    ? new Set(user.disabledAiTools)
    : null
  const activeTools = disabledAiTools
    ? mcpToolDefinitions.filter((tool) => !disabledAiTools.has(tool.name))
    : mcpToolDefinitions

  // Prompt caching (C-355): only against real Anthropic — local-LLM proxies behind
  // ANTHROPIC_BASE_URL may reject the cache_control field entirely.
  const useCaching = !env.ANTHROPIC_BASE_URL
  const toolsForRequest = (
    useCaching && activeTools.length > 0
      ? activeTools.map((tool, i) =>
          i === activeTools.length - 1 ? { ...tool, cache_control: { type: 'ephemeral' as const } } : tool,
        )
      : activeTools
  ) as unknown as Anthropic.Tool[]
  const systemForRequest = useCaching
    ? [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }]
    : systemPrompt

  const usedToolCalls: { name: string; result: unknown; display?: DisplayRow[] }[] = []
  let finalAssistantText = ''

  return new ReadableStream({
    async start(controller) {
      const enqueue = (data: Record<string, unknown>) =>
        controller.enqueue(new TextEncoder().encode(sseEvent(data)))

      // Fly's edge proxy resets idle HTTP/2 streams after ~60s; prompt eval
      // before the first token and slow tool rounds can exceed that. SSE
      // comments keep bytes flowing and are skipped by the client parser.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 20_000)

      let streamError: string | undefined
      try {
        let continueLoop = true
        let toolRounds = 0

        while (continueLoop) {
          if (signal?.aborted) break

          // After the round cap, tool_choice none starves the model of tools so it must answer.
          const round = trackedStream(userId, {
            model: env.AI_MODEL,
            max_tokens: 4096,
            system: systemForRequest,
            tools: toolsForRequest,
            ...(toolRounds >= MAX_TOOL_ROUNDS ? { tool_choice: { type: 'none' as const } } : {}),
            messages,
          }, signal)

          let sentTextThisRound = false
          for await (const ev of round.stream) {
            if (ev.type === 'content_block_start' && ev.content_block.type === 'tool_use') {
              enqueue({ type: 'tool_start', tool: ev.content_block.name })
            } else if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta' && ev.delta.text) {
              // Rounds are separate assistant turns but the client renders one
              // message — separate them so tool-preamble text doesn't run into
              // the final answer.
              if (!sentTextThisRound && finalAssistantText) {
                finalAssistantText += '\n\n'
                enqueue({ type: 'text_delta', text: '\n\n' })
              }
              sentTextThisRound = true
              finalAssistantText += ev.delta.text
              enqueue({ type: 'text_delta', text: ev.delta.text })
            }
          }
          const response = await round.finalMessage()

          if (signal?.aborted) break

          const toolResultContents: Anthropic.ToolResultBlockParam[] = []
          const willUseTools = response.stop_reason === 'tool_use'
          const toolUseBlocks = (response.content as ContentBlock[]).filter(
            (block): block is ToolUseBlock => block.type === 'tool_use',
          )

          if (willUseTools && toolUseBlocks.length > 0) {
            toolRounds++
            messages.push({ role: 'assistant', content: response.content as Anthropic.ContentBlockParam[] })

            for (const toolBlock of toolUseBlocks) {
              if (signal?.aborted) break

              let result: unknown
              try {
                result = await executeToolCall(
                userId,
                toolBlock.name,
                toolBlock.input as Record<string, unknown>,
                { source: 'chat', attachedFiles: files } as ToolContext,
              )
              } catch (err) {
                result = { error: err instanceof Error ? err.message : 'Tool execution failed' }
              }

              const display = displayRowsFor(toolBlock.name, result)
              usedToolCalls.push({ name: toolBlock.name, result, ...(display ? { display } : {}) })
              enqueue({ type: 'tool_result', toolName: toolBlock.name, result, ...(display ? { display } : {}) })
              const uiAction = uiActionFromToolResult(toolBlock.name, result)
              if (uiAction) enqueue(uiAction)

              toolResultContents.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: boundedToolResult(result),
              })
            }

            messages.push({ role: 'user', content: toolResultContents })
          } else {
            continueLoop = false
          }
        }

      } catch {
        streamError = 'AI request failed. Check the provider configuration and try again.'
      } finally {
        try {
          await settleAiAction({
            userId,
            sessionId,
            userMessage: message,
            assistantText: finalAssistantText,
            toolCalls: usedToolCalls,
            aborted: !!signal?.aborted,
            actionBucket: 'ai',
          })

          if (needsTitleGeneration && !signal?.aborted) {
            generateSessionTitle(userId, sessionId, message, chatLocale)
          }
        } catch {
          streamError = 'Could not save chat. Please try again.'
        }

        clearInterval(heartbeat)
        if (!signal?.aborted) {
          enqueue(streamError ? { type: 'error', message: streamError } : {
            type: 'done',
            toolCalls: usedToolCalls.map((t) => t.name),
            toolResults: usedToolCalls,
            sessionId,
          })
        }
        controller.close()
      }
    },
  })
}
