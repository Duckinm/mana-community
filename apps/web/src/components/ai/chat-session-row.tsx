import { Check, Ellipsis, Pencil, Pin, PinOff, Trash2, X } from "@/components/icons";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { menuItemDestructive } from "@/components/ui/menu-styles";
import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { formatTimestampDistance } from "@/lib/timestamp";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { ApiChatSession } from "@/lib/api-types";

export type ChatSession = ApiChatSession;

interface Props {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDeleted: () => void;
  comfortable?: boolean;
}

export function ChatSessionRow({
  session,
  isActive,
  onSelect,
  onDeleted,
  comfortable = false,
}: Props) {
  const { t } = useTranslation("chat");
  const queryClient = useQueryClient();
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(session.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      await client.api.chat.sessions({ sessionId: session.id }).delete();
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
      if (isActive) onDeleted();
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePin() {
    await client.api.chat
      .sessions({ sessionId: session.id })
      .pinned.patch({ pinned: !session.pinned });
    queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
  }

  function startRename() {
    setRenameValue(session.title);
    setRenaming(true);
    setTimeout(() => {
      const input = renameInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }

  async function commitRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === session.title) {
      setRenaming(false);
      return;
    }
    await client.api.chat
      .sessions({ sessionId: session.id })
      .title.patch({ title: trimmed });
    queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
    setRenaming(false);
  }

  function cancelRename(e?: React.MouseEvent) {
    e?.stopPropagation();
    setRenaming(false);
    setRenameValue(session.title);
  }

  const relativeTime = formatTimestampDistance(session.updatedAt);
  const showActions = comfortable || hovered || isActive || menuOpen;
  const iconSize = comfortable ? 16 : 12;
  const actionPad = comfortable
    ? "flex size-11 items-center justify-center"
    : "flex size-6 items-center justify-center";

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={
          comfortable
            ? "group flex w-full items-start justify-between gap-2 rounded-xl px-3 py-3 transition-colors"
            : "group flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors"
        }
        style={{
          background: isActive
            ? "var(--primary-soft)"
            : hovered
              ? "var(--accent)"
              : "transparent",
          border: isActive
            ? "1px solid var(--primary-border)"
            : "1px solid transparent",
        }}
      >
        {renaming ? (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitRename();
                  if (e.key === "Escape") cancelRename();
                }}
                className={`min-w-0 flex-1 bg-transparent text-foreground outline-none ${comfortable ? "text-base" : "text-sm"}`}
                style={{ fontFamily: "inherit" }}
              />
              <button
                type="button"
                onClick={() => void commitRename()}
                className={`${actionPad} shrink-0 text-primary hover:text-primary`}
              >
                <Check size={iconSize} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={cancelRename}
                className={`${actionPad} shrink-0 text-muted-foreground hover:text-foreground`}
              >
                <X size={iconSize} strokeWidth={2.5} />
              </button>
            </div>
            <span
              className={`text-muted-foreground ${comfortable ? "text-sm" : "text-xs"}`}
            >
              {relativeTime}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(session.id)}
            className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md text-left outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <span
              className={`truncate font-medium leading-snug ${comfortable ? "text-base" : "text-sm"} ${isActive ? "text-foreground" : "text-muted-foreground"}`}
            >
              {session.pinned && (
                <Pin
                  size={comfortable ? 12 : 10}
                  className="mr-1 inline text-primary opacity-70"
                  weight="fill"
                />
              )}
              {session.title || t("untitledChat")}
            </span>
            <span
              className={`text-muted-foreground ${comfortable ? "text-sm" : "text-xs"}`}
            >
              {relativeTime}
            </span>
          </button>
        )}

        {showActions && !renaming && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              aria-label={t("moreActions")}
              className={`${actionPad} mt-0.5 shrink-0 rounded-lg text-muted-foreground transition-colors hover:text-foreground`}
            >
              <Ellipsis size={comfortable ? 18 : 14} strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => startRename()}>
                <Pencil size={16} strokeWidth={1.75} />
                {t("rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleTogglePin()}>
                {session.pinned ? (
                  <PinOff size={16} strokeWidth={1.75} />
                ) : (
                  <Pin size={16} strokeWidth={1.75} />
                )}
                {session.pinned ? t("unpin") : t("pin")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={deleting}
                onSelect={() => setConfirmDelete(true)}
                className={menuItemDestructive}
              >
                <Trash2 size={16} strokeWidth={1.75} />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteChatTitle")}
        description={t("deleteChatDescription")}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
