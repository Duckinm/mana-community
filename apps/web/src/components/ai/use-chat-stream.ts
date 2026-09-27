import { consumeSseJsonEvents } from '@/lib/chat-stream'
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useRef, useState, useCallback, useEffect } from 'react'
import i18next from '@/lib/i18n'
import type { AttachedFile } from '@/components/command-input'
import type { ChatToolResult } from '@/components/ai/chat-tool-result'
import { parseChatUiAction } from '@/components/ai/chat-ui-action'
import type { ChatUiOverlay } from '@/components/ai/chat-ui-action'
import { client } from '@/lib/eden'

const BASE_URL = resolveApiBaseUrl()

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  toolCalls?: string[]
  toolResults?: ChatToolResult[]
}

const KNOWN_TOOLS = new Set([
  'get_projects', 'get_tasks', 'get_financial_summary', 'get_contacts',
  'get_transactions', 'get_user_context', 'get_usage', 'get_storage_summary',
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
  isCurrent: () => boolean
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setToolStatus: (v: string | null) => void
  setIsStreaming: (v: boolean) => void
  streamingIdRef: MutableRefObject<string | null>
  isStreamingRef: MutableRefObject<boolean>
  onMutationRef: MutableRefObject<((toolCalls: string[]) => void) | undefined>
  onDoneRef: MutableRefObject<((toolResults: ChatToolResult[]) => void) | undefined>
  onSessionRef: MutableRefObject<((sessionId: string) => void) | undefined>
  onStreamSettledRef: MutableRefObject<((isCurrent: () => boolean) => void) | undefined>
  onUiActionRef: MutableRefObject<((overlay: ChatUiOverlay) => void) | undefined>
  pendingToolResultsRef: MutableRefObject<ChatToolResult[]>
  setError: (message: string | null) => void
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
    case 'error': {
      const errMsg = i18next.t('streamFailed', { ns: 'chat' })
      d.setError(errMsg)
      d.setMessages((prev) => prev.map((m) => m.id === d.assistantId ? { ...m, isStreaming: false } : m))
      d.setIsStreaming(false)
      d.setToolStatus(null)
      d.streamingIdRef.current = null
      d.isStreamingRef.current = false
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
      d.onStreamSettledRef.current?.(d.isCurrent)
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
  onStreamSettled?: (isCurrent: () => boolean) => void,
  onUiAction?: (overlay: ChatUiOverlay) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setError(null)
    return () => { abortControllerRef.current?.abort() }
  }, [sessionId])
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
    setError(null)
    setIsStreaming(true)
    setToolStatus(null)

    const requestTimer = setTimeout(() => abortController.abort(new Error('CHAT_STREAM_TIMEOUT')), 120_000)
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
        const detail = await res.json().catch(() => null)
        throw new Error(detail?.code === 'AI_NOT_CONFIGURED'
          ? i18next.t('aiUnavailable', { ns: 'capabilities' })
          : i18next.t('errorRetry', { ns: 'chat' }))
      }

      const deps: StreamEventDeps = {
        assistantId,
        isCurrent: () => abortControllerRef.current === abortController && !abortController.signal.aborted,
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
        setError,
      }
      await consumeSseJsonEvents(res.body, (ev) => {
        if (abortControllerRef.current === abortController) applyChatStreamEvent(ev, deps)
      }, abortController.signal)
      return true
    } catch (err) {
      if (abortControllerRef.current === abortController && !isAbortError(err)) {
        const message = err instanceof Error && err.message === 'CHAT_STREAM_TIMEOUT'
          ? i18next.t('streamTimeout', { ns: 'chat' })
          : err instanceof Error && err.message === 'CHAT_STREAM_INTERRUPTED'
            ? i18next.t('streamInterrupted', { ns: 'chat' })
            : err instanceof Error && err.message === i18next.t('aiUnavailable', { ns: 'capabilities' })
              ? err.message
              : i18next.t('errorRetry', { ns: 'chat' })
        setError(message)
      }
      return false
    } finally {
      clearTimeout(requestTimer)
      if (abortControllerRef.current !== abortController) return
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m))
      setIsStreaming(false)
      setToolStatus(null)
      streamingIdRef.current = null
      isStreamingRef.current = false
    }
  }, [sessionId])

  return {
    messages,
    error,
    isStreaming,
    toolStatus,
    sendMessage,
    stopGeneration,
    clearHistory,
    clearMessages,
  }
}
