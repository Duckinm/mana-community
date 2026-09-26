import { describe, expect, it } from 'bun:test'
import { emailCatalog, EMAIL_TEMPLATE_IDS, renderCatalogEmail } from '@api/utils/email/catalog'

describe('email catalog', () => {
  it('renders every registered fixture through React Email', async () => {
    for (const id of EMAIL_TEMPLATE_IDS) {
      const definition = emailCatalog[id]
      const rendered = await renderCatalogEmail(id, definition.fixture)
      expect(rendered.subject.length).toBeGreaterThan(5)
      expect(rendered.subject).not.toContain('{{')
      expect(rendered.html).toContain('MANA')
      expect(rendered.text).toContain('MANA')
    }
  })

  it('escapes recipient-provided markup', async () => {
    const rendered = await renderCatalogEmail('calendar-reminder', {
      ...emailCatalog['calendar-reminder'].fixture,
      eventTitle: '<script>alert(1)</script>',
    })
    expect(rendered.html).not.toContain('<script>alert(1)</script>')
    expect(rendered.html).toContain('&lt;script&gt;')
  })

  it('keeps subjects and plain-text copy reviewable', async () => {
    const copy = Object.fromEntries(await Promise.all(EMAIL_TEMPLATE_IDS.map(async (id) => {
      const rendered = await renderCatalogEmail(id, emailCatalog[id].fixture)
      return [id, { subject: rendered.subject, text: rendered.text }]
    })))
    expect(JSON.stringify(copy, null, 2)).toMatchSnapshot()
  })
})
