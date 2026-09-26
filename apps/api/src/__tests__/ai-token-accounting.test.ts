import { describe, expect, it } from 'bun:test'
import { estimateAiCostUsd } from '@api/modules/billing/usage'

describe('ai token accounting', () => {
  it('estimates cost from tokens at published per-MTok prices (Kimi K2.6 via Moonshot)', () => {
    // $0.95/M input, $4.00/M output
    expect(estimateAiCostUsd(1_000_000, 0)).toBeCloseTo(0.95, 10)
    expect(estimateAiCostUsd(0, 1_000_000)).toBe(4)
    expect(estimateAiCostUsd(10_000, 2_000)).toBeCloseTo(0.0175, 10)
    expect(estimateAiCostUsd(0, 0)).toBe(0)
  })
})
