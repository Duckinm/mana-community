export { cn } from '@mana/ui/cn'

/**
 * Extract a human-readable error message from a TanStack Form errors array.
 * Standard Schema (Zod) returns error objects like { message: string }, not
 * plain strings, so we need to unwrap them.
 */
export function fieldError(errors: unknown[]): string | undefined {
  if (!errors.length) return undefined
  const e = errors[0]
  if (!e) return undefined
  if (typeof e === 'string') return e
  if (typeof e === 'object' && 'message' in (e as object)) {
    return String((e as { message: unknown }).message)
  }
  return undefined
}
