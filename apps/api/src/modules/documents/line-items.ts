import { documentItems } from '@mana/db'
import { computeDocumentTotals } from '@api/lib/document-totals'
import { fromQuantity } from '@api/lib/quantity'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import type { Static } from 'elysia'
import type { DocumentItemBody } from '@api/lib/db-schema'

export type ItemBody = Static<typeof DocumentItemBody>

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export function itemsWithSubtotalsFromBodies(items: ItemBody[]) {
  return items.map((item) => ({
    ...item,
    subtotalCents: Math.round(fromQuantity(item.quantity) * item.unitPriceCents),
  }))
}

export function documentItemRowsForInsert(
  documentId: string,
  items: ReturnType<typeof itemsWithSubtotalsFromBodies>,
) {
  return items.map((item) => ({
    documentId,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    subtotalCents: item.subtotalCents,
    position: item.position,
  }))
}

/** Replace a document's line items inside an open transaction and return the recomputed totals, or recompute totals from existing items if only tax/discount/wht changed. Returns undefined if neither items nor totals-affecting fields changed. */
export async function replaceItemsAndComputeTotalsInPatchTx(
  tx: DbTransaction,
  documentId: string,
  body: { items?: ItemBody[]; discountCents?: number; taxRateBps?: number; whtRateBps?: number },
  existing: { discountCents: number; taxRateBps: number; whtRateBps: number },
  existingItems: (typeof documentItems.$inferSelect)[],
): Promise<ReturnType<typeof computeDocumentTotals> | undefined> {
  if (body.items !== undefined) {
    await tx.delete(documentItems).where(eq(documentItems.documentId, documentId))
    const itemsWithSubtotals = itemsWithSubtotalsFromBodies(body.items)
    const discountCents = body.discountCents ?? existing.discountCents
    const taxRateBps = body.taxRateBps ?? existing.taxRateBps
    const whtRateBps = body.whtRateBps ?? existing.whtRateBps
    const totals = computeDocumentTotals({ items: itemsWithSubtotals, taxRateBps, discountCents, whtRateBps })
    if (itemsWithSubtotals.length > 0) {
      await tx.insert(documentItems).values(documentItemRowsForInsert(documentId, itemsWithSubtotals))
    }
    return totals
  }
  if (body.discountCents !== undefined || body.taxRateBps !== undefined || body.whtRateBps !== undefined) {
    const discountCents = body.discountCents ?? existing.discountCents
    const taxRateBps = body.taxRateBps ?? existing.taxRateBps
    const whtRateBps = body.whtRateBps ?? existing.whtRateBps
    return computeDocumentTotals({ items: existingItems, taxRateBps, discountCents, whtRateBps })
  }
  return undefined
}
