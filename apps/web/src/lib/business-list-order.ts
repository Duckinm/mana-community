import type { QueryClient } from '@tanstack/react-query'

/** Flip default flag only — keeps list order stable (no re-sort). */
export function flipDefaultInList<T extends { id: string; isDefault: boolean }>(
  items: T[],
  defaultId: string,
): T[] {
  return items.map((item) => ({
    ...item,
    isDefault: item.id === defaultId,
  }))
}

export function reorderByIdList<T extends { id: string }>(
  items: T[],
  idOrder: string[],
): T[] {
  if (!Array.isArray(items) || idOrder.length === 0) return Array.isArray(items) ? items : []
  const byId = new Map(items.map((item) => [item.id, item]))
  const ordered: T[] = []
  for (const id of idOrder) {
    const item = byId.get(id)
    if (item) ordered.push(item)
  }
  for (const item of items) {
    if (!idOrder.includes(item.id)) ordered.push(item)
  }
  return ordered
}

/** Keep UI list order stable across refetches (creation order from first load). */
export function captureListOrder<T extends { id: string }>(
  qc: QueryClient,
  orderKey: readonly unknown[],
  items: T[],
): T[] {
  if (!Array.isArray(items)) return []
  const itemIds = new Set(items.map((item) => item.id))
  const saved = qc.getQueryData<string[]>(orderKey)
  if (saved?.length) {
    const savedSet = new Set(saved)
    const sameMembers =
      saved.length === items.length &&
      saved.every((id) => itemIds.has(id)) &&
      items.every((item) => savedSet.has(item.id))
    if (sameMembers) return reorderByIdList(items, saved)
  }
  qc.setQueryData(
    orderKey,
    items.map((item) => item.id),
  )
  return items
}

export function appendListOrderId(
  qc: QueryClient,
  orderKey: readonly unknown[],
  id: string,
) {
  const saved = qc.getQueryData<string[]>(orderKey) ?? []
  if (!saved.includes(id)) {
    qc.setQueryData(orderKey, [...saved, id])
  }
}

export function removeListOrderId(
  qc: QueryClient,
  orderKey: readonly unknown[],
  id: string,
) {
  const saved = qc.getQueryData<string[]>(orderKey)
  if (saved) {
    qc.setQueryData(
      orderKey,
      saved.filter((itemId) => itemId !== id),
    )
  }
}
