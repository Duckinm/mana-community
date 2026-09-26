import thBanksData from '@/data/th-banks.json'

export type ThaiBankType =
  | 'commercial'
  | 'government'
  | 'foreign_branch'
  | 'specialized'
  | 'state'

export interface ThaiBank {
  code: string
  abbreviation: string
  slug: string
  nameTh: string
  nameEn: string
  officialNameEn: string
  swift: string | null
  accountDigits: number[]
  type: ThaiBankType
  active: boolean
  mergedInto?: string
  color?: string
}

export interface ThaiBanksCatalog {
  updatedAt: string
  banks: ThaiBank[]
}

export const thBanksCatalog = thBanksData as ThaiBanksCatalog

export const thBanks = thBanksCatalog.banks

export const activeThBanks = thBanks.filter((bank) => bank.active)

export function getThBankByCode(code: string): ThaiBank | undefined {
  const normalized = code.padStart(3, '0')
  return thBanks.find((bank) => bank.code === normalized)
}

export function getThBankByAbbreviation(abbreviation: string): ThaiBank | undefined {
  const normalized = abbreviation.toUpperCase()
  return thBanks.find((bank) => bank.abbreviation === normalized)
}

export function getThBankBySlug(slug: string): ThaiBank | undefined {
  return thBanks.find((bank) => bank.slug === slug)
}
