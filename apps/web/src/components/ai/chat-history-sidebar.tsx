import {
  ChatSessionRow,
  type ChatSession,
} from "@/components/ai/chat-session-row";
import { ChatSessionRowSkeleton } from "@/components/ai/chat-session-row-skeleton";
import { X } from "@/components/icons";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import { client, expectEden } from "@/lib/eden";
import { motionEase } from "@/lib/motion";
import { queryKeys } from "@/lib/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void | Promise<void>;
  onNewChat: () => void | Promise<void>;
  onClose: () => void;
}

function HistoryBody({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onClose,
  showClose,
  comfortable = false,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void | Promise<void>;
  onNewChat: () => void | Promise<void>;
  onClose: () => void;
  showClose: boolean;
  comfortable?: boolean;
}) {
  const { t } = useTranslation("chat");
  const queryClient = useQueryClient();

  const {
    data: sessions,
    isLoading,
    isError,
    refetch,
  } = useQuery<ChatSession[]>({
    queryKey: queryKeys.chatSessions,
    queryFn: async () => expectEden(await client.api.chat.sessions.get()),
  });

  function handleDeleted(deletedId: string) {
    if (deletedId === activeSessionId) {
      void onNewChat();
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
  }

  return (
    <>
      <SheetDragRegion
        className={
          comfortable
            ? "mb-2 flex min-h-14 shrink-0 items-center justify-between px-4 pb-2 pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))]"
            : "mb-3 flex min-h-0 shrink-0 items-center justify-between px-3 pt-4"
        }
      >
        <h2
          className={
            comfortable
              ? "text-sm font-semibold tracking-tight text-foreground"
              : "text-2xs font-semibold uppercase tracking-widest text-caption"
          }
        >
          {t("history")}
        </h2>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground active:bg-surface-raised active:text-foreground"
            aria-label={t("toggleHistory")}
          >
            <X size={18} />
          </button>
        )}
      </SheetDragRegion>

      <div
        className={
          comfortable
            ? "min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] touch-pan-y overscroll-y-contain"
            : "min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-1.5 touch-pan-y overscroll-y-contain [scrollbar-gutter:stable_both-edges]"
        }
      >
        {isLoading && (
          <>
            <ChatSessionRowSkeleton />
            <ChatSessionRowSkeleton />
            <ChatSessionRowSkeleton />
          </>
        )}
        {isError && (
          <div className="px-3 py-6">
            <QueryErrorPanel onRetry={() => void refetch()} />
          </div>
        )}
        {!isLoading && !isError && (!sessions || sessions.length === 0) && (
          <p
            className={`px-4 py-10 text-center text-muted-foreground ${comfortable ? "text-base" : "text-sm"}`}
          >
            {t("noPreviousChats")}
          </p>
        )}
        {sessions?.map((session) => (
          <ChatSessionRow
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            comfortable={comfortable}
            onSelect={(id) => {
              void onSelectSession(id);
              if (showClose) onClose();
            }}
            onDeleted={() => handleDeleted(session.id)}
          />
        ))}
      </div>
    </>
  );
}

export function ChatHistorySidebar({
  open,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onClose,
}: Props) {
  return (
    <>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="chat-history-panel"
            initial={{ width: 0 }}
            animate={{ width: 260 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.25, ease: motionEase }}
            className="relative z-auto hidden h-full shrink-0 overflow-hidden border-r border-border bg-card xl:flex"
          >
            <div className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden">
              <HistoryBody
                activeSessionId={activeSessionId}
                onSelectSession={onSelectSession}
                onNewChat={onNewChat}
                onClose={onClose}
                showClose={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        side="left"
        className="w-[min(28rem,calc(100vw-0.75rem))] border-0 xl:hidden"
        overlayClassName="xl:hidden"
      >
        <HistoryBody
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
          onNewChat={onNewChat}
          onClose={onClose}
          showClose
          comfortable
        />
      </Sheet>
    </>
  );
}
