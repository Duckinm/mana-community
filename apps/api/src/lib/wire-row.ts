import { instantToIso, instantToIsoRequired } from '@api/lib/instant'

export function instantFieldToWire(value: Date | null | undefined): string | null {
  return instantToIso(value)
}

type WireFieldValue<V> =
  V extends Date ? string :
  V extends Date | null ? string | null :
  V extends Date | undefined ? string | undefined :
  V extends Date | null | undefined ? string | null | undefined :
  V

export type WireTimestamps<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: WireFieldValue<T[P]>
}

export function wireTimestamps<T extends Record<string, unknown>, K extends keyof T>(
  row: T,
  keys: readonly K[],
): WireTimestamps<T, K> {
  const out = { ...row }
  for (const key of keys) {
    const value = out[key]
    if (value instanceof Date) {
      ;(out as Record<string, unknown>)[key as string] = instantToIsoRequired(value)
    } else if (value === null || value === undefined) {
      ;(out as Record<string, unknown>)[key as string] = null
    }
  }
  return out as WireTimestamps<T, K>
}
