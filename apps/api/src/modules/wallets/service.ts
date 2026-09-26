import { db } from '@api/db'
import { wallets } from '@mana/db'
import { eq, and, desc } from 'drizzle-orm'
import { walletToWire } from '@api/modules/wallets/wire'

export async function listWallets(userId: string) {
  const rows = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .orderBy(desc(wallets.isDefault), wallets.createdAt)
  return rows.map(walletToWire)
}

export interface WalletInput {
  name: string
  type: string
  lastFour?: string | null
  color?: string
  isDefault?: boolean
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  swiftCode?: string | null
  promptPayId?: string | null
  cardNumber?: string | null
  cardExpiry?: string | null
  cardholderName?: string | null
  showOnInvoice?: boolean
  isDefaultInvoice?: boolean
}

/** Clear the default flag on every other wallet so only one stays default. */
async function unsetOtherDefaults(userId: string) {
  await db
    .update(wallets)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(wallets.userId, userId))
}

/** Clear the invoice-default flag on every other wallet so only one stays default. */
async function unsetOtherInvoiceDefaults(userId: string) {
  await db
    .update(wallets)
    .set({ isDefaultInvoice: false, updatedAt: new Date() })
    .where(eq(wallets.userId, userId))
}

export async function createWallet(userId: string, input: WalletInput) {
  if (input.isDefault) await unsetOtherDefaults(userId)
  if (input.isDefaultInvoice) await unsetOtherInvoiceDefaults(userId)

  const [row] = await db
    .insert(wallets)
    .values({
      userId,
      name: input.name,
      type: input.type,
      lastFour: input.lastFour ?? null,
      color: input.color ?? '#5b8def',
      isDefault: input.isDefault ?? false,
      bankName: input.bankName ?? null,
      accountNumber: input.accountNumber ?? null,
      accountName: input.accountName ?? null,
      swiftCode: input.swiftCode ?? null,
      promptPayId: input.promptPayId ?? null,
      cardNumber: input.cardNumber ?? null,
      cardExpiry: input.cardExpiry ?? null,
      cardholderName: input.cardholderName ?? null,
      showOnInvoice: input.showOnInvoice ?? false,
      isDefaultInvoice: input.isDefaultInvoice ?? false,
    })
    .returning()
  return walletToWire(row)
}

export async function patchWallet(userId: string, id: string, patch: Partial<WalletInput>) {
  const [existing] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)))
    .limit(1)
  if (!existing) return null

  if (patch.isDefault) await unsetOtherDefaults(userId)
  if (patch.isDefaultInvoice) await unsetOtherInvoiceDefaults(userId)

  const [row] = await db
    .update(wallets)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.lastFour !== undefined ? { lastFour: patch.lastFour } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
      ...(patch.bankName !== undefined ? { bankName: patch.bankName } : {}),
      ...(patch.accountNumber !== undefined ? { accountNumber: patch.accountNumber } : {}),
      ...(patch.accountName !== undefined ? { accountName: patch.accountName } : {}),
      ...(patch.swiftCode !== undefined ? { swiftCode: patch.swiftCode } : {}),
      ...(patch.promptPayId !== undefined ? { promptPayId: patch.promptPayId } : {}),
      ...(patch.cardNumber !== undefined ? { cardNumber: patch.cardNumber } : {}),
      ...(patch.cardExpiry !== undefined ? { cardExpiry: patch.cardExpiry } : {}),
      ...(patch.cardholderName !== undefined ? { cardholderName: patch.cardholderName } : {}),
      ...(patch.showOnInvoice !== undefined ? { showOnInvoice: patch.showOnInvoice } : {}),
      ...(patch.isDefaultInvoice !== undefined ? { isDefaultInvoice: patch.isDefaultInvoice } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)))
    .returning()
  return row ? walletToWire(row) : null
}

export async function deleteWallet(userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(wallets)
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)))
    .returning({ id: wallets.id })
  return result.length > 0
}
