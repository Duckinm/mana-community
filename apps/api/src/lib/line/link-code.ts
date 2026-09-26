/** No I/O/0/1 — the code is read off a screen and typed into a phone. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateLinkCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

/** Users paste the code with extra words ("code: A2B4C6"), so pull every code-shaped token out instead of matching the whole message. */
export function extractCandidateCodes(text: string): string[] {
  return [...new Set(text.toUpperCase().match(new RegExp(`[A-Z0-9]{${CODE_LENGTH}}`, 'g')) ?? [])]
}
