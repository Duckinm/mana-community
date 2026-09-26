import type { senderProfiles, remarkTemplates } from '@mana/db'
import { wireTimestamps, type WireTimestamps } from '@api/lib/wire-row'
import { presignDocumentImage } from '@api/modules/documents/images'
import { etaxFromEmail } from '@api/modules/documents/send-etax'

type SenderProfileRow = typeof senderProfiles.$inferSelect
type RemarkTemplateRow = typeof remarkTemplates.$inferSelect

const PROFILE_TIMESTAMP_KEYS = ['createdAt', 'updatedAt'] as const satisfies readonly (keyof SenderProfileRow)[]
const TEMPLATE_TIMESTAMP_KEYS = ['createdAt', 'updatedAt'] as const satisfies readonly (keyof RemarkTemplateRow)[]

export type SenderProfileWire = WireTimestamps<SenderProfileRow, typeof PROFILE_TIMESTAMP_KEYS[number]> & {
  etaxFromEmail: string
}
export type RemarkTemplateWire = WireTimestamps<RemarkTemplateRow, typeof TEMPLATE_TIMESTAMP_KEYS[number]>

export async function senderProfileToWire(row: SenderProfileRow): Promise<SenderProfileWire> {
  const [yourLogo, signatureImage] = await Promise.all([
    presignDocumentImage(row.yourLogo),
    presignDocumentImage(row.signatureImage),
  ])
  return {
    ...wireTimestamps(row, PROFILE_TIMESTAMP_KEYS),
    yourLogo,
    signatureImage,
    etaxFromEmail: etaxFromEmail(row.userId),
  }
}

export function remarkTemplateToWire(row: RemarkTemplateRow): RemarkTemplateWire {
  return wireTimestamps(row, TEMPLATE_TIMESTAMP_KEYS)
}
