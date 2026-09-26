const HEX6 = /^#[0-9a-fA-F]{6}$/
const BYTE = /^[0-9a-fA-F]{2}$/

export const DEFAULT_PROJECT_COLOR = '#5f96f5'

export function projectColorToHex(color: string): string {
  if (HEX6.test(color)) return color.toLowerCase()
  if (typeof document === 'undefined') return DEFAULT_PROJECT_COLOR

  const probe = document.createElement('span')
  probe.style.color = color
  probe.style.display = 'none'
  document.documentElement.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()

  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (!match) return DEFAULT_PROJECT_COLOR

  return `#${[match[1], match[2], match[3]]
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')}`
}

export function withAlphaHex(color: string, alphaByte: string): string {
  const aa = (alphaByte.length === 1 ? `0${alphaByte}` : alphaByte).slice(0, 2).toLowerCase()
  if (!BYTE.test(aa)) return color
  if (HEX6.test(color)) return `${color}${aa}`
  const n = parseInt(aa, 16)
  const pct = Math.round((n / 255) * 10_000) / 100
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}
