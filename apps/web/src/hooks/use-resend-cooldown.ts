import { useEffect, useRef, useState } from 'react'

export function useResendCooldown(seconds = 30) {
  const [remaining, setRemaining] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function start() {
    setRemaining(seconds)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  return { remaining, active: remaining > 0, start }
}
