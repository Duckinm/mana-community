import { useEffect, useState } from 'react'
import { resolveEditorMediaUrl } from './tiptap-media-upload'

export function useResolvedMediaUrl(fileId: string | null, fallbackSrc: string | null) {
  const [resolved, setResolved] = useState<string | null>(null)

  useEffect(() => {
    setResolved(null)
    if (!fileId) return

    let cancelled = false

    async function fetchUrl(attempt = 0) {
      const url = await resolveEditorMediaUrl(fileId!)
      if (cancelled) return
      if (url) {
        setResolved(url)
        return
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 250))
        return fetchUrl(attempt + 1)
      }
    }

    void fetchUrl()
    return () => {
      cancelled = true
    }
  }, [fileId, fallbackSrc])

  return resolved ?? fallbackSrc
}
