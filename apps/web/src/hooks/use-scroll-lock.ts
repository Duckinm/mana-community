import { useEffect } from 'react'

/** Locks body scroll for the lifetime of the calling component. */
export function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
}
