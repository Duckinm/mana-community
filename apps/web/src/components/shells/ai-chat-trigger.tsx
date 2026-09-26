import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ManaSparkle } from "@/components/icons/mana-sparkle";
import { useTranslation } from "react-i18next";

type AiChatTriggerProps = {
  collapsed?: boolean;
  isActive?: boolean;
  className?: string;
};

export function AiChatTrigger({
  collapsed = false,
  isActive = false,
  className,
}: AiChatTriggerProps) {
  const { t } = useTranslation("nav");
  return (
    <Link
      to="/chat"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "ai-chat-trigger",
        collapsed && "ai-chat-trigger--icon",
        isActive && "ai-chat-trigger--active",
        className,
      )}
    >
      <span className="ai-chat-trigger__glow" aria-hidden />
      <ManaSparkle
        size={collapsed ? 14 : 13}
        className="ai-chat-trigger__icon shrink-0"
      />
      {!collapsed && (
        <span className="ai-chat-trigger__label">{t("chatWithAi")}</span>
      )}
    </Link>
  );
}
