import { client, expectEden } from "@/lib/eden"
import type { ApiChatSessionSearchResult } from "@/lib/api-types"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ChatSearchResultsSkeleton } from "@/components/ai/chat-search-results-skeleton"
import { Search, X, MessageSquare } from "@/components/icons"
import { useTranslation } from "react-i18next"

interface Props {
  open: boolean
  onClose: () => void
}

export function ChatSearchDialog({ open, onClose }: Props) {
  const { t, i18n } = useTranslation("chat")
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ApiChatSessionSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = expectEden(
          await client.api.chat.sessions.search.get({ query: { q: query.trim() } }),
        )
        setResults(data)
      } catch {
        // silently ignore
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function handleSelect(sessionId: string) {
    onClose()
    await navigate({ to: "/chat/$sessionId", params: { sessionId } })
  }

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-surface-overlay/60 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-border-subtle bg-surface-overlay shadow-modal overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label={t("clearSearch")}
              onClick={() => setQuery("")}
              className="flex shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:text-foreground max-xl:size-11 xl:size-6"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="flex shrink-0 items-center justify-center rounded-lg text-caption transition-colors duration-fast hover:text-foreground max-xl:size-11 xl:rounded xl:border xl:border-border-subtle xl:px-1.5 xl:py-0.5 xl:text-xs xl:hover:border-border-default"
          >
            <span className="max-xl:hidden">{t("esc")}</span>
            <X size={18} className="xl:hidden" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && <ChatSearchResultsSkeleton />}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("noResultsFor", { query })}
            </div>
          )}
          {!loading && query.trim().length < 2 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("typeToSearch")}
            </div>
          )}
          {!loading && results.map((r) => (
            <button
              key={r.sessionId}
              type="button"
              onClick={() => void handleSelect(r.sessionId)}
              className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-primary-soft transition-colors duration-fast border-b border-border-subtle last:border-0"
            >
              <MessageSquare size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{r.sessionTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                  {r.snippet}
                </p>
              </div>
              <span className="text-2xs text-caption shrink-0 mt-0.5">
                {new Date(r.sessionUpdatedAt).toLocaleDateString(i18n.language, { month: "short", day: "numeric" })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
