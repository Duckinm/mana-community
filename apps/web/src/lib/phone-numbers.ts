const THAI_PHONE_RE = /^(?:\+?66[\s-]?|0)?[\d\s-]{8,12}$/

export function splitPhoneNumbers(value: string | null | undefined): string[] {
  return value?.split(',').map((phone) => phone.trim()).filter(Boolean) ?? []
}

export function isValidThaiPhoneNumbers(value: string): boolean {
  const phones = value.split(',').map((phone) => phone.trim())
  return phones.length > 0 && phones.every((phone) => phone.length > 0 && THAI_PHONE_RE.test(phone))
}

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
