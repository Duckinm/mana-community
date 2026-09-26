import { describe, expect, it } from 'bun:test'
import { reassignRemarkDefaults } from '@api/modules/business/service'

describe('reassignRemarkDefaults', () => {
  const rows = [
    { id: 'terms', defaultFor: ['QO', 'INV'] },
    { id: 'thanks', defaultFor: ['RC'] },
  ]

  it('clears newly selected types from other templates without touching unselected defaults', () => {
    expect(reassignRemarkDefaults(rows, null, ['INV', 'RC'])).toEqual([
      { id: 'terms', defaultFor: ['QO'] },
      { id: 'thanks', defaultFor: [] },
    ])
  })

  it('replaces the edited template selection and preserves other unclaimed defaults', () => {
    expect(reassignRemarkDefaults(rows, 'thanks', ['INV'])).toEqual([
      { id: 'terms', defaultFor: ['QO'] },
      { id: 'thanks', defaultFor: ['INV'] },
    ])
  })
})
