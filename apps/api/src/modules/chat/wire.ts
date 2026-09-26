import type { chatMessages } from '@mana/db'
import { instantFieldToWire } from '@api/lib/wire-row'

type ChatMessageRow = typeof chatMessages.$inferSelect

export function chatMessageToWire(row: ChatMessageRow) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    toolCalls: row.toolCalls ? JSON.parse(row.toolCalls) : null,
    toolResults: row.toolResults ? JSON.parse(row.toolResults) : null,
    createdAt: instantFieldToWire(row.createdAt)!,
  }
}

export function chatSessionToWire(row: {
  id: string
  title: string
  titleGeneratedAt: Date | null
  pinned: boolean
  createdAt: Date
  updatedAt: Date
  messageCount: number | bigint
}) {
  return {
    id: row.id,
    title: row.title,
    titleGeneratedAt: instantFieldToWire(row.titleGeneratedAt),
    pinned: row.pinned,
    createdAt: instantFieldToWire(row.createdAt)!,
    updatedAt: instantFieldToWire(row.updatedAt)!,
    messageCount: Number(row.messageCount),
  }
}

export function chatSessionCreatedToWire(row: { id: string; title: string; createdAt: Date }) {
  return {
    id: row.id,
    title: row.title,
    createdAt: instantFieldToWire(row.createdAt)!,
  }
}
