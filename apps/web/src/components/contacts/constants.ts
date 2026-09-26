const LAST_CONTACT_TAG_RE = /^last\s+contact(ed)?\s*:/i

/** Tags only — excludes legacy seed strings that duplicated `lastContactedAt`. */
export function displayContactTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return []
  return tags.filter((tag) => !LAST_CONTACT_TAG_RE.test(tag.trim()))
}
