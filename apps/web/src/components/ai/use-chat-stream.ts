import { resolveApiBaseUrl } from "@/lib/api-base-url";
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useRef, useState, useCallback } from 'react'
import i18next from '@/lib/i18n'
import type { AttachedFile } from '@/components/command-input'
import type { ChatToolResult } from '@/components/ai/chat-tool-result'
import { parseChatUiAction } from '@/components/ai/chat-ui-action'
import type { ChatUiOverlay } from '@/components/ai/chat-ui-action'
import { client } from '@/lib/eden'

const BASE_URL = resolveApiBaseUrl()

export type CapReachedInfo = {
  used: number
  cap: number
  resetAt: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  toolCalls?: string[]
  toolResults?: ChatToolResult[]
  capReached?: CapReachedInfo
}

const KNOWN_TOOLS = new Set([
  'get_projects', 'get_tasks', 'get_financial_summary', 'get_contacts',
  'get_transactions', 'get_user_context', 'get_plan_usage', 'get_storage_summary',
  'create_task', 'create_project', 'create_contact', 'create_transaction',
  'update_task', 'update_task_status', 'update_project', 'update_transaction',
  'update_contact', 'delete_task', 'delete_project', 'delete_contact',
  'delete_transaction', 'duplicate_task', 'duplicate_project', 'restore_task',
  'restore_project', 'bulk_create_tasks', 'draft_email', 'open_view', 'get_contact', 'get_project',
  'get_unpaid_invoices', 'get_overdue_invoices', 'summarize_contact', 'get_transaction',
  'get_contacts', 'search_contacts', 'get_dashboard_snapshot',
])

function toolStatusLabel(toolName: string): string {
  if (KNOWN_TOOLS.has(toolName)) return i18next.t(`tool.${toolName}`, { ns: 'chat' })
  return i18next.t('tool.fallback', { ns: 'chat', tool: toolName.replace(/_/g, ' ') })
}

const WRITE_TOOLS = new Set([
  // Project / task mutations
  'create_task', 'update_task', 'update_task_status', 'delete_task',
  'duplicate_task', 'restore_task', 'bulk_create_tasks',
  'bulk_update_task_status', 'reorder_tasks',
  'create_project', 'update_project', 'delete_project', 'restore_project',
  'duplicate_project', 'archive_project', 'link_contact_to_project',
  // Contact mutations
  'create_contact', 'update_contact', 'delete_contact',
  'merge_contacts',
  'add_contact_note', 'update_relationship_level',
  // Finance mutations
  'create_transaction', 'update_transaction', 'delete_transaction',
  'mark_transaction_paid', 'bulk_categorize_transactions',
  // Storage mutations
  'upload_file_to_storage', 'move_file', 'delete_file',
  // User mutations
  'update_user',
])

type StreamEventDeps = {
  assistantId: string
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setToolStatus: (v: string | null) => void
  setIsStreaming: (v: boolean) => void
  streamingIdRef: MutableRefObject<string | null>
  isStreamingRef: MutableRefObject<boolean>
  onMutationRef: MutableRefObject<((toolCalls: string[]) => void) | undefined>
  onDoneRef: MutableRefObject<((toolResults: ChatToolResult[]) => void) | undefined>
  onSessionRef: MutableRefObject<((sessionId: string) => void) | undefined>
  onStreamSettledRef: MutableRefObject<(() => void) | undefined>
  onUiActionRef: MutableRefObject<((overlay: ChatUiOverlay) => void) | undefined>
  pendingToolResultsRef: MutableRefObject<ChatToolResult[]>
  setCapped: Dispatch<SetStateAction<boolean>>
  cappedResetAtRef: MutableRefObject<string | null>
}

async function consumeSseJsonEvents(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel()
        break
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue
        let event: Record<string, unknown>
        try {
          event = JSON.parse(raw)
        } catch {
          continue
        }
        onEvent(event)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function applyChatStreamEvent(event: Record<string, unknown>, d: StreamEventDeps): void {
  const type = event.type as string
  switch (type) {
    case 'text_delta': {
      const delta = (event.text as string) ?? ''
      d.setMessages((prev) =>
        prev.map((m) => (m.id === d.assistantId ? { ...m, content: m.content + delta } : m)),
      )
      return
    }
    case 'tool_start': {
      const toolName = (event.tool as string) ?? ''
      d.setToolStatus(toolStatusLabel(toolName))
      return
    }
    case 'tool_result': {
      const toolName = (event.toolName as string) ?? ''
      const result = event.result
      const display = event.display as ChatToolResult['display']
      d.pendingToolResultsRef.current = [
        ...d.pendingToolResultsRef.current,
        { name: toolName, result, ...(display?.length ? { display } : {}) },
      ]
      d.setMessages((prev) =>
        prev.map((m) =>
          m.id === d.assistantId
            ? { ...m, toolResults: [...d.pendingToolResultsRef.current] }
            : m,
        ),
      )
      d.setToolStatus(null)
      return
    }
    case 'ui_action': {
      const overlay = parseChatUiAction(event)
      if (overlay) d.onUiActionRef.current?.(overlay)
      return
    }
    case 'cap_reached': {
      const capReached: CapReachedInfo = {
        used: (event.used as number) ?? 0,
        cap: (event.cap as number) ?? 0,
        resetAt: (event.resetAt as string) ?? new Date().toISOString(),
      }
      d.setMessages((prev) =>
        prev.map((m) =>
          m.id === d.assistantId ? { ...m, content: '', capReached, isStreaming: false } : m,
        ),
      )
      d.cappedResetAtRef.current = capReached.resetAt
      d.setCapped(true)
      d.setIsStreaming(false)
      d.setToolStatus(null)
      d.streamingIdRef.current = null
      d.isStreamingRef.current = false
      d.onStreamSettledRef.current?.()
      return
    }
    case 'error': {
      const errMsg =
        (event.message as string) ?? i18next.t('errorRetry', { ns: 'chat' })
      d.setMessages((prev) =>
        prev.map((m) =>
          m.id === d.assistantId ? { ...m, content: errMsg, isStreaming: false } : m,
        ),
      )
      d.setIsStreaming(false)
      d.setToolStatus(null)
      d.streamingIdRef.current = null
      d.isStreamingRef.current = false
      d.onStreamSettledRef.current?.()
      return
    }
    case 'done': {
      const toolCalls = (event.toolCalls as string[]) ?? []
      const toolResults = (event.toolResults as ChatToolResult[] | undefined) ?? d.pendingToolResultsRef.current
      const returnedSessionId = event.sessionId as string | undefined
      d.setMessages((prev) =>
        prev.map((m) =>
          m.id === d.assistantId
            ? { ...m, isStreaming: false, toolCalls, toolResults }
            : m,
        ),
      )
      d.setIsStreaming(false)
      d.setToolStatus(null)
      d.streamingIdRef.current = null
      d.isStreamingRef.current = false
      if (d.onMutationRef.current && toolCalls.some((t) => WRITE_TOOLS.has(t))) {
        d.onMutationRef.current(toolCalls)
      }
      if (returnedSessionId) {
        d.onSessionRef.current?.(returnedSessionId)
      }
      d.onDoneRef.current?.(toolResults)
      d.onStreamSettledRef.current?.()
      return
    }
    default:
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useChatStream(
  sessionId: string | null,
  _user: { aiMemory?: boolean | null } | null,
  onMutation?: (toolCalls: string[]) => void,
  onDone?: (toolResults: ChatToolResult[]) => void,
  onSession?: (sessionId: string) => void,
  onStreamSettled?: () => void,
  onUiAction?: (overlay: ChatUiOverlay) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [capped, setCapped] = useState(false)
  const cappedResetAtRef = useRef<string | null>(null)
  const streamingIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isStreamingRef = useRef(false)

  const onMutationRef = useRef(onMutation)
  onMutationRef.current = onMutation
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const onSessionRef = useRef(onSession)
  onSessionRef.current = onSession
  const onStreamSettledRef = useRef(onStreamSettled)
  onStreamSettledRef.current = onStreamSettled
  const onUiActionRef = useRef(onUiAction)
  onUiActionRef.current = onUiAction
  const pendingToolResultsRef = useRef<ChatToolResult[]>([])
  const clearHistory = useCallback(async () => {
    try {
      await client.api.chat.history.delete()
    } catch {
      // Silently ignore
    }
    setMessages([])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const sendMessage = useCallback(async (text: string, files?: AttachedFile[]) => {
    if (isStreamingRef.current) return
    const messageText = text.trim() || (files?.length ? 'Please review the attached file.' : '')
    if (!messageText) return

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    isStreamingRef.current = true

    const userId = `user-${Date.now()}`
    const assistantId = `assistant-${Date.now()}`
    streamingIdRef.current = assistantId
    pendingToolResultsRef.current = []

    const attachedNames = files?.length
      ? `\n[Attached: ${files.map((f) => f.file.name).join(', ')}]`
      : ''
    const displayContent = text + attachedNames

    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: displayContent },
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ])
    setIsStreaming(true)
    setToolStatus(null)

    try {
      let apiFiles: Array<{ name: string; mediaType: string; data: string; isImage: boolean }> = []
      if (files?.length) {
        apiFiles = await Promise.all(
          files.map(async (af) => ({
            name: af.file.name,
            mediaType: af.file.type || 'application/octet-stream',
            data: await fileToBase64(af.file),
            isImage: af.isImage,
          })),
        )
      }

      const locale = i18next.language.startsWith('th') ? 'th' : 'en'
      const body: Record<string, unknown> = { message: messageText, locale }
      if (sessionId) body.sessionId = sessionId
      if (apiFiles.length) body.files = apiFiles

      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(res.statusText || 'Request failed')
      }

      const deps: StreamEventDeps = {
        assistantId,
        setMessages,
        setToolStatus,
        setIsStreaming,
        streamingIdRef,
        isStreamingRef,
        onMutationRef,
        onDoneRef,
        onSessionRef,
        onStreamSettledRef,
        onUiActionRef,
        pendingToolResultsRef,
        setCapped,
        cappedResetAtRef,
      }
      await consumeSseJsonEvents(res.body, (ev) => applyChatStreamEvent(ev, deps), abortController.signal)
    } catch (err) {
      if (isAbortError(err)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        )
        setIsStreaming(false)
        setToolStatus(null)
        streamingIdRef.current = null
        isStreamingRef.current = false
        onStreamSettledRef.current?.()
        return
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: i18next.t('errorRetry', { ns: 'chat' }), isStreaming: false }
            : m
        )
      )
      setIsStreaming(false)
      setToolStatus(null)
      streamingIdRef.current = null
      isStreamingRef.current = false
      onStreamSettledRef.current?.()
    }
  }, [sessionId])

  const isCapped = useCallback(() => {
    if (!capped) return false
    const resetAt = cappedResetAtRef.current
    if (resetAt && Date.now() >= new Date(resetAt).getTime()) {
      setCapped(false)
      cappedResetAtRef.current = null
      return false
    }
    return true
  }, [capped])

  return {
    messages,
    isStreaming,
    toolStatus,
    sendMessage,
    stopGeneration,
    clearHistory,
    clearMessages,
    capped,
    isCapped,
  }
}
