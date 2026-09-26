import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import type { Document } from '@/components/documents/types'

type InsertItem = {
  description: string
  unitPriceCents: number
  quantity: number
}

export function useInsertIntoDocument() {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  async function insert(doc: Document, items: InsertItem[]): Promise<void> {
    setIsPending(true)
    try {
      const existing = expectEden(await client.api.documents({ id: doc.id }).get())
      const existingItems = (existing.items ?? []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        position: item.position,
      }))
      const newItems = items.map((item, i) => ({
        ...item,
        position: existingItems.length + i,
      }))
      expectEden(
        await client.api
          .documents({ id: doc.id })
          .patch({ items: [...existingItems, ...newItems] }),
      )
      await queryClient.invalidateQueries({ queryKey: queryKeys.document(doc.id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents })
    } finally {
      setIsPending(false)
    }
  }

  return { insert, isPending }
}
