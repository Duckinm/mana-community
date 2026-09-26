import { t } from 'elysia'
import { TASK_STATUSES, type TaskStatus } from '@mana/db'

export const FILE_KINDS = ['image', 'pdf', 'doc', 'sheet', 'video', 'archive', 'other'] as const
export type FileKind = (typeof FILE_KINDS)[number]

export const STORAGE_ENTITY_TYPES = ['contact', 'project', 'transaction', 'task'] as const
export type StorageEntityType = (typeof STORAGE_ENTITY_TYPES)[number]

export const TASK_PRIORITIES = ['high', 'med', 'low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TRANSACTION_TYPES = ['revenue', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TRANSACTION_STATUSES = ['received', 'pending', 'overdue', 'paid'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]

export function parseFileKind(value: string): FileKind {
  if ((FILE_KINDS as readonly string[]).includes(value)) return value as FileKind
  return 'other'
}

export function parseStorageEntityType(value: string): StorageEntityType {
  if ((STORAGE_ENTITY_TYPES as readonly string[]).includes(value)) return value as StorageEntityType
  throw new Error(`Invalid storage entity type: ${value}`)
}

export function parseTaskPriority(value: string): TaskPriority {
  if ((TASK_PRIORITIES as readonly string[]).includes(value)) return value as TaskPriority
  return 'med'
}

export function parseTransactionType(value: string): TransactionType {
  if ((TRANSACTION_TYPES as readonly string[]).includes(value)) return value as TransactionType
  throw new Error(`Invalid transaction type: ${value}`)
}

export function parseTransactionStatus(value: string): TransactionStatus {
  if ((TRANSACTION_STATUSES as readonly string[]).includes(value)) return value as TransactionStatus
  return 'pending'
}

export { TASK_STATUSES, type TaskStatus }

export const FileKindSchema = t.Union([
  t.Literal('image'),
  t.Literal('pdf'),
  t.Literal('doc'),
  t.Literal('sheet'),
  t.Literal('video'),
  t.Literal('archive'),
  t.Literal('other'),
])

export const StorageEntityTypeSchema = t.Union([
  t.Literal('contact'),
  t.Literal('project'),
  t.Literal('transaction'),
  t.Literal('task'),
])

export const NullableStorageEntityTypeSchema = t.Union([StorageEntityTypeSchema, t.Null()])

export const TaskPrioritySchema = t.Union([
  t.Literal('high'),
  t.Literal('med'),
  t.Literal('low'),
])

export const TaskStatusSchema = t.Union([
  t.Literal('todo'),
  t.Literal('in-progress'),
  t.Literal('done'),
  t.Literal('canceled'),
])

export const TransactionTypeSchema = t.Union([
  t.Literal('revenue'),
  t.Literal('expense'),
])

export const TransactionStatusSchema = t.Union([
  t.Literal('received'),
  t.Literal('pending'),
  t.Literal('overdue'),
  t.Literal('paid'),
])
