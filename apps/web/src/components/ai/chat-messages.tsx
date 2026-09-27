import type { ChatMessage } from "@/components/ai/use-chat-stream";
import type { ChatUiOverlay } from "@/components/ai/chat-ui-action";
import { ChatToolWidgets } from "@/components/ai/chat-tool-widgets";
import { motion, AnimatePresence } from "framer-motion";
import { Copy } from "@/components/icons";
import { ManaSparkle } from "@/components/icons/mana-sparkle";
import { Streamdown } from "streamdown";
import { useTranslation } from "react-i18next";

interface Props {
  messages: ChatMessage[];
  toolStatus: string | null;
  onOpenOverlay?: (overlay: ChatUiOverlay) => void;
}

export function ChatMessages({ messages, toolStatus, onOpenOverlay }: Props) {
  const { t } = useTranslation("chat");
  if (messages.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-4xl mb-6 space-y-3"
      >
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mr-2 shrink-0 mt-0.5"
                style={{
                  background: "var(--primary-border)",
                  border: "1px solid var(--primary-border)",
                }}
              >
                <ManaSparkle size={20} className="text-primary" />
              </div>
            )}
            <div
              className="min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? {
                      background: "var(--primary-soft)",
                      border: "1px solid var(--primary-border)",
                      color: "var(--text-primary)",
                    }
                  : {
                      background: "var(--surface-raised)",
                      border: "1px solid var(--surface-overlay)",
                      color: "var(--text-primary)",
                    }
              }
            >
              {msg.role === "assistant" ? (
                <>
                  <Streamdown className="streamdown-chat">{msg.content}</Streamdown>
                  {!msg.isStreaming && msg.content.trim() && (
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(msg.content)}
                        className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors"
                        title={t("copyMessage")}
                      >
                        <Copy size={11} strokeWidth={2} />
                        {t("copy")}
                      </button>
                    </div>
                  )}
                  {msg.isStreaming && msg.content.trim() && !toolStatus && (
                    <span className="ml-1 inline-flex items-center gap-1.5 align-middle">
                      <span className="h-1.5 w-1.5 rounded-full ai-dot-1 bg-primary" />
                      <span className="h-1.5 w-1.5 rounded-full ai-dot-2 bg-primary" />
                      <span className="h-1.5 w-1.5 rounded-full ai-dot-3 bg-primary" />
                    </span>
                  )}
                  {msg.isStreaming && toolStatus && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-primary">
                      <span className="animate-pulse">⬡</span>
                      <span>{toolStatus}</span>
                    </div>
                  )}
                  {msg.isStreaming && !toolStatus && !msg.content.trim() && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full ai-dot-1 bg-primary" />
                      <span className="h-1.5 w-1.5 rounded-full ai-dot-2 bg-primary" />
                      <span className="h-1.5 w-1.5 rounded-full ai-dot-3 bg-primary" />
                    </div>
                  )}
                  {(msg.toolResults?.length ?? 0) > 0 && (
                    <ChatToolWidgets toolResults={msg.toolResults} onOpenOverlay={onOpenOverlay} />
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}

      </motion.div>
    </AnimatePresence>
  );
}
