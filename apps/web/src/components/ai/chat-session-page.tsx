import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { ChatHistorySidebar } from "@/components/ai/chat-history-sidebar";
import { CookbookDialog } from "@/components/ai/cookbook-dialog";
import { ChatMessages } from "@/components/ai/chat-messages";
import { ChatMessagesSkeleton } from "@/components/ai/chat-messages-skeleton";
import {
  useChatStream,
  type ChatMessage,
} from "@/components/ai/use-chat-stream";
import { ChatSearchDialog } from "@/components/ai/chat-search-dialog";
import { ChatUiOverlay as ChatUiOverlayDialog } from "@/components/ai/chat-ui-overlay";
import type { ChatUiOverlay } from "@/components/ai/chat-ui-action";
import type { ChatToolResult } from "@/components/ai/chat-tool-result";
import { isRecord } from "@/components/ai/chat-tool-result";
import { AutoModelChip } from "@/components/ai/auto-model-chip";
import { CommandInput, type AttachedFile } from "@/components/command-input";
import { useContacts } from "@/context/contacts";
import { useFinance } from "@/context/finance";
import { useProjects } from "@/context/projects";
import { useSettings } from "@/context/settings";
import { todayCalendarDate } from "@/lib/calendar-date";
import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import {
  getRouteApi,
  useNavigate,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import {
  BookOpen,
  Download,
  PanelLeft,
  Search,
  SquarePen,
} from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "@/lib/i18n";

const chatRoute = getRouteApi('/_app/chat/$sessionId')

function exportToMarkdown(messages: ChatMessage[], title: string): string {
  const userLabel = i18next.t("export.user", { ns: "chat" });
  const aiLabel = i18next.t("export.ai", { ns: "chat" });
  const lines: string[] = [
    i18next.t("export.title", { ns: "chat", title }) as string,
    "",
  ];
  for (const msg of messages) {
    if (!msg.content.trim()) continue;
    lines.push(
      `**${msg.role === "user" ? userLabel : aiLabel}:** ${msg.content}`,
    );
    lines.push("");
  }
  return lines.join("\n");
}

type ApiChatMessage = {
  id: string;
  role: string;
  content: string;
  toolResults?: ChatToolResult[] | null;
};

function mapApiMessages(rows: ApiChatMessage[]): ChatMessage[] {
  return rows.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    toolResults: m.toolResults ?? undefined,
  }));
}

export function ChatSessionPage() {
  const { t } = useTranslation("chat");
  const { sessionId } = chatRoute.useParams();
  const navigate = useNavigate();
  const { userId } = useRouteContext({ from: "/_app" });
  // Per-user so a fresh account never inherits another account's open state
  const historySidebarKey = `ai-history-sidebar-open:${userId}`;
  const routerState = useRouterState();
  const pendingState = routerState.location.state as unknown as Record<
    string,
    unknown
  > | null;
  const pendingMessage = pendingState?.pendingMessage as string | undefined;
  const pendingFiles = pendingState?.pendingFiles as AttachedFile[] | undefined;
  const { user } = useSettings();
  const { refetch: refetchProjects } = useProjects();
  const { refetch: refetchContacts } = useContacts();
  const { refetch: refetchFinance } = useFinance();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState(false);
  const [sessionTitle, setSessionTitle] = useState(t("defaultTitle"));
  const [showHistorySidebar, setShowHistorySidebar] = useState(() => {
    try {
      if (!window.matchMedia("(min-width: 1024px)").matches) return false;
      return localStorage.getItem(historySidebarKey) === "true";
    } catch {
      return false;
    }
  });
  const [showSearch, setShowSearch] = useState(false);
  const [showCookbook, setShowCookbook] = useState(false);
  const [uiOverlay, setUiOverlay] = useState<ChatUiOverlay | null>(null);

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

  const handleMutation = useCallback(
    (toolCalls: string[]) => {
      const projectTools = [
        "create_task",
        "update_task",
        "update_task_status",
        "delete_task",
        "duplicate_task",
        "restore_task",
        "bulk_create_tasks",
        "create_project",
        "update_project",
        "delete_project",
        "restore_project",
        "duplicate_project",
      ];
      if (toolCalls.some((t) => projectTools.includes(t))) refetchProjects();
      if (
        toolCalls.some((t) =>
          ["create_contact", "update_contact", "delete_contact"].includes(t),
        )
      )
        refetchContacts();
      if (
        toolCalls.some((t) =>
          [
            "create_transaction",
            "update_transaction",
            "delete_transaction",
          ].includes(t),
        )
      )
        refetchFinance();
      if (
        toolCalls.some((t) =>
          ["upload_file_to_storage", "move_file", "delete_file"].includes(t),
        )
      ) {
        queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
        queryClient.invalidateQueries({
          queryKey: queryKeys.storageTrashedFiles,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.storageFolders });
      }
    },
    [refetchProjects, refetchContacts, refetchFinance, queryClient],
  );

  const pendingDocumentNavRef = useRef<string | null>(null);

  const handleDone = useCallback(
    (toolResults: ChatToolResult[]) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
      }, 3000);

      const created = toolResults.find(
        (tool) =>
          tool.name === "create_document" &&
          isRecord(tool.result) &&
          typeof tool.result.id === "string" &&
          !tool.result.error,
      );
      if (
        created &&
        isRecord(created.result) &&
        typeof created.result.id === "string"
      ) {
        pendingDocumentNavRef.current = created.result.id;
      }
    },
    [queryClient],
  );

  const clearMessagesRef = useRef<(() => void) | null>(null);

  const handleUiAction = useCallback(
    (overlay: ChatUiOverlay) => {
      if (overlay.entity === "project") {
        navigate({
          to: "/projects/$projectId/overview",
          params: { projectId: overlay.id },
        });
        return;
      }
      if (overlay.entity === "task") {
        navigate({
          to: "/projects/$projectId/issues/$taskId",
          params: { projectId: overlay.projectId, taskId: overlay.id },
          search: {
            statuses: [],
            priorities: [],
            tags: [],
            due: null,
            created: null,
            milestone: null,
          },
        });
        return;
      }
      setUiOverlay(overlay);
    },
    [navigate],
  );

  const onStreamSettled = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const result = await client.api.chat
        .sessions({ sessionId })
        .messages.get();
      if (result.error) return;
      if (result.data) {
        setSessionMessages(mapApiMessages(result.data as ApiChatMessage[]));
      }
      clearMessagesRef.current?.();
    } catch {
      // ignore
    }
    if (pendingDocumentNavRef.current) {
      const documentId = pendingDocumentNavRef.current;
      pendingDocumentNavRef.current = null;
      navigate({ to: "/documents/$documentId", params: { documentId } });
    }
  }, [sessionId, navigate]);

  const {
    messages: streamingMessages,
    isStreaming,
    toolStatus,
    sendMessage,
    stopGeneration,
    clearMessages,
    isCapped,
  } = useChatStream(
    sessionId,
    user,
    handleMutation,
    handleDone,
    undefined,
    onStreamSettled,
    handleUiAction,
  );

  clearMessagesRef.current = clearMessages;

  useEffect(() => {
    async function loadSession() {
      setMessagesLoading(true);
      setMessagesError(false);
      clearMessages();
      try {
        const result = await client.api.chat
          .sessions({ sessionId })
          .messages.get();
        if (result.error) throw result.error;
        if (result.data) {
          setSessionMessages(mapApiMessages(result.data as ApiChatMessage[]));
        }
      } catch {
        setMessagesError(true);
        setSessionMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    }
    void loadSession();
  }, [sessionId, clearMessages]);

  useEffect(() => {
    async function loadTitle() {
      try {
        const result = await client.api.chat.sessions.get();
        if (!result.error && result.data) {
          const found = (
            result.data as Array<{ id: string; title: string }>
          ).find((s) => s.id === sessionId);
          if (found) setSessionTitle(found.title);
        }
      } catch {
        // ignore
      }
    }
    void loadTitle();
  }, [sessionId]);

  useEffect(() => {
    if (!pendingMessage && !pendingFiles?.length) return;
    const pendingKey = `chat-pending-sent:${sessionId}`;
    if (sessionStorage.getItem(pendingKey)) return;
    sessionStorage.setItem(pendingKey, "1");
    void sendMessage(pendingMessage ?? "", pendingFiles);
  }, [pendingFiles, pendingMessage, sendMessage, sessionId]);

  useEffect(() => {
    // Autofocus on a touch device pops the native keyboard on every visit
    if (window.matchMedia("(pointer: coarse)").matches) return;
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingMessages, sessionMessages]);

  const displayMessages = [...sessionMessages, ...streamingMessages];
  const currentBucketCapped = isCapped();

  function handleExport() {
    const md = exportToMarkdown(displayMessages, sessionTitle);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const date = todayCalendarDate();
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSelectSession(id: string) {
    await navigate({ to: "/chat/$sessionId", params: { sessionId: id } });
  }

  async function handleNewChat() {
    await navigate({ to: "/chat" });
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      <ChatHistorySidebar
        open={showHistorySidebar}
        activeSessionId={sessionId}
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
              onClick={() => setShowSearch(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-muted-foreground transition-all duration-base hover:text-foreground sm:size-8"
              aria-label={t("searchMessages")}
            >
              <Search size={15} strokeWidth={1.75} />
            </button>
            {displayMessages.length > 0 && (
              <button
                type="button"
                onClick={handleExport}
                className="flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-muted-foreground transition-all duration-base hover:text-foreground sm:size-8"
                aria-label={t("exportChat")}
              >
                <Download size={15} strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleNewChat()}
              className="flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-muted-foreground transition-all duration-base hover:text-foreground sm:size-8"
              aria-label={t("newChat")}
            >
              <SquarePen size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="page-scroll px-3 pb-4 pt-16 sm:px-4"
        >
          <div className="mt-auto w-full flex justify-center">
            {messagesLoading && displayMessages.length === 0 ? (
              <ChatMessagesSkeleton />
            ) : messagesError && displayMessages.length === 0 ? (
              <QueryErrorPanel
                message={t("messagesLoadFailed")}
                onRetry={() => {
                  setMessagesError(false);
                  setMessagesLoading(true);
                  void client.api.chat
                    .sessions({ sessionId })
                    .messages.get()
                    .then((result) => {
                      if (result.error) throw result.error;
                      if (result.data) {
                        setSessionMessages(
                          mapApiMessages(result.data as ApiChatMessage[]),
                        );
                      }
                    })
                    .catch(() => setMessagesError(true))
                    .finally(() => setMessagesLoading(false));
                }}
              />
            ) : (
              <ChatMessages
                messages={displayMessages}
                toolStatus={toolStatus}
                onOpenOverlay={handleUiAction}
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center px-3 pt-3 pb-3 max-xl:pb-mobile-dock sm:px-4 xl:pb-6">
          <CommandInput
            ref={inputRef}
            onSubmit={(text, files) => sendMessage(text, files)}
            hasMessages={displayMessages.length > 0}
            isStreaming={isStreaming}
            onStop={stopGeneration}
            disabled={currentBucketCapped}
            leftSlot={<AutoModelChip />}
          />
        </div>
      </main>

      <ChatSearchDialog
        open={showSearch}
        onClose={() => setShowSearch(false)}
      />
      <CookbookDialog
        open={showCookbook}
        onClose={() => setShowCookbook(false)}
        onPick={(text) => void sendMessage(text)}
      />
      <ChatUiOverlayDialog
        overlay={uiOverlay}
        onClose={() => setUiOverlay(null)}
      />
    </div>
  );
}
