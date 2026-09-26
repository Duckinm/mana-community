/** `metVia` is stored as these canonical English values, so display must translate them. */
export const MET_VIA_OPTIONS = [
  { value: 'Direct', key: 'direct' },
  { value: 'Referral', key: 'referral' },
  { value: 'LinkedIn', key: 'linkedin' },
  { value: 'Event', key: 'event' },
  { value: 'Cold outreach', key: 'coldOutreach' },
  { value: 'Client', key: 'client' },
  { value: 'Friend', key: 'friend' },
  { value: 'Import', key: 'import' },
  { value: 'Other', key: 'other' },
]

export function metViaLabel(value: string, t: (key: string) => string): string {
  const match = MET_VIA_OPTIONS.find((o) => o.value === value)
  return match ? t(`metVia.${match.key}`) : value
}
