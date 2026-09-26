const THAI_BLOCK = '฀-๿'
const COMBINING_MARKS = /[̀-ͯ]/g
const NON_THAI_SLUG_CHARS = new RegExp(`[^${THAI_BLOCK}a-z0-9]+`, 'g')

function trimHyphens(value: string): string {
  return value.replace(/^-+|-+$/g, '')
}

export function slugifyEn(title: string): string {
  return trimHyphens(
    title
      .normalize('NFKD')
      .replace(COMBINING_MARKS, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-'),
  )
}

// Thai keeps its own characters — transliterating would produce slugs no Thai reader recognises.
export function slugifyTh(title: string): string {
  return trimHyphens(title.toLowerCase().replace(NON_THAI_SLUG_CHARS, '-'))
}

export function deriveSlug(locale: 'th' | 'en', title: string | null | undefined): string | null {
  if (!title?.trim()) return null
  const slug = locale === 'th' ? slugifyTh(title) : slugifyEn(title)
  return slug || null
}
