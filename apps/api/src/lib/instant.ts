/** Serialize a DB instant for JSON wire (ISO 8601). */
export function instantToIso(value: Date | null | undefined): string | null {
  if (value == null) return null
  return value.toISOString()
}

export function instantToIsoRequired(value: Date): string {
  return value.toISOString()
}
