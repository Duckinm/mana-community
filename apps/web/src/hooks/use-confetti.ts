import confetti from 'canvas-confetti'
import { useEffect } from 'react'

const TOKENS = ['--primary', '--category-green', '--category-orange', '--category-purple', '--warning']

// ponytail: reads live design-token values so confetti follows theme/brand changes instead of a hardcoded palette
function themeColors() {
  const style = getComputedStyle(document.documentElement)
  return TOKENS.map((name) => style.getPropertyValue(name).trim()).filter(Boolean)
}

const WAVES = [
  { delay: 0, particleCount: 100, spread: 70, origin: { x: 0.5, y: 0.35 }, startVelocity: 50, ticks: 260, scalar: 1.1 },
  { delay: 250, particleCount: 60, angle: 65, spread: 52, origin: { x: 0, y: 0.65 }, startVelocity: 60, ticks: 220 },
  { delay: 430, particleCount: 60, angle: 115, spread: 52, origin: { x: 1, y: 0.65 }, startVelocity: 60, ticks: 220 },
]

export function fireConfetti(delay = 0) {
  const colors = themeColors()
  return WAVES.map((wave) => {
    const { delay: waveDelay, ...options } = wave
    return setTimeout(() => confetti({ ...options, colors }), delay + waveDelay)
  })
}

export function useConfetti() {
  useEffect(() => {
    const timers = fireConfetti(450)
    return () => timers.forEach(clearTimeout)
  }, [])
}
