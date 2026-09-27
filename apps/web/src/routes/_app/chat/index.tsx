import { useCapabilities } from '@/hooks/use-capabilities';
import { toast } from 'sonner';
import { ChatHistorySidebar } from "@/components/ai/chat-history-sidebar";
import { CookbookDialog } from "@/components/ai/cookbook-dialog";
import { AutoModelChip } from "@/components/ai/auto-model-chip";
import { CommandInput, type AttachedFile } from "@/components/command-input";
import { client, expectEden } from "@/lib/eden";
import {
  createFileRoute,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { BookOpen, PanelLeft, SquarePen } from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/chat/")({
  component: ChatHome,
});

function ChatHome() {
  const { t, i18n } = useTranslation("chat");
  const navigate = useNavigate();
  const { data: capabilities } = useCapabilities();
  const [submitting, setSubmitting] = useState(false);
  const { userId } = useRouteContext({ from: "/_app" });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Per-user so a fresh account never inherits another account's open state
  const historySidebarKey = `ai-history-sidebar-open:${userId}`;
  const [showCookbook, setShowCookbook] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(() => {
    try {
      if (!window.matchMedia("(min-width: 1024px)").matches) return false;
      return localStorage.getItem(historySidebarKey) === "true";
    } catch {
      return false;
    }
  });

  function toggleHistorySidebar() {
    setShowHistorySidebar((v) => {
      const next = !v;
      try {
        if (window.matchMedia("(min-width: 1024px)").matches) {
          localStorage.setItem(historySidebarKey, String(next));
        }
      } catch {}
      return next;
    });
  }

  const handleSelectSession = useCallback(
    async (id: string) => {
      await navigate({ to: "/chat/$sessionId", params: { sessionId: id } });
    },
    [navigate],
  );

  const handleNewChat = useCallback(() => {}, []);

  async function handleSubmit(text: string, files: AttachedFile[] = []) {
    if ((!text.trim() && files.length === 0) || submitting) return false;
    if (!capabilities?.ai) {
      toast.error(t("aiUnavailable", { ns: "capabilities" }));
      return false;
    }
    setSubmitting(true);
    try {
      const { id } = expectEden(await client.api.chat.sessions.post({}));
      await navigate({
        to: "/chat/$sessionId",
        params: { sessionId: id },
        state: { pendingMessage: text, pendingFiles: files } as Record<string, unknown>,
      });
      return true;
    } catch {
      toast.error(t("errorRetry"));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    // Autofocus on a touch device pops the native keyboard on every visit
    if (window.matchMedia("(pointer: coarse)").matches) return;
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative flex h-full overflow-hidden">
      <ChatHistorySidebar
        open={showHistorySidebar}
        activeSessionId={null}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onClose={() => setShowHistorySidebar(false)}
      />

      <main className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="absolute left-2 right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex items-center justify-between sm:left-4 sm:right-4 sm:top-4">
          <button
            type="button"
            onClick={toggleHistorySidebar}
            className={`flex size-9 items-center justify-center rounded-lg border transition-all duration-base sm:size-8 ${
              showHistorySidebar
                ? "bg-primary-soft border-primary-border text-primary"
                : "bg-surface-raised border-border-subtle text-muted-foreground hover:text-foreground"
            }`}
            aria-label={t("toggleHistory")}
          >
            <PanelLeft size={15} strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCookbook(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-muted-foreground transition-all duration-base hover:text-foreground sm:size-8"
              aria-label={t("cookbook.open")}
            >
              <BookOpen size={15} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              disabled
              className="flex size-9 cursor-default items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-muted-foreground opacity-30 transition-all duration-base sm:size-8"
              aria-label={t("newChat")}
            >
              <SquarePen size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-xl px-4 text-center">
            <h1 className="mb-3 text-4xl font-light leading-[1.05] tracking-[-0.02em] text-foreground sm:text-5xl md:text-6xl">
              {t("heading")}
              <br />
              <em className="font-light italic text-primary">
                {t("headingEmphasis")}
              </em>
            </h1>
            <p className="text-sm font-normal text-muted-foreground">
              {new Date().toLocaleDateString(i18n.language, {
                weekday: "long",
              })}{" "}
              ·{" "}
              {new Date().toLocaleDateString(i18n.language, {
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center px-3 pt-3 pb-3 max-xl:pb-mobile-dock sm:px-4 xl:pb-6">
          <CommandInput
            ref={inputRef}
            onSubmit={handleSubmit}
            hasMessages={false}
            disabled={submitting}
            onSuggestionClick={(text) => void handleSubmit(text)}
            leftSlot={<AutoModelChip />}
          />
        </div>
      </main>

      <CookbookDialog
        open={showCookbook}
        onClose={() => setShowCookbook(false)}
        onPick={(text) => void handleSubmit(text)}
      />
    </div>
  );
}
