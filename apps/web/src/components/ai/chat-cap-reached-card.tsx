import type { CapReachedInfo } from "@/components/ai/use-chat-stream";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight } from "@/components/icons";
import { formatTimestamp } from "@/lib/timestamp";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

interface Props {
  capReached: CapReachedInfo;
}

export function ChatCapReachedCard({ capReached }: Props) {
  const { t } = useTranslation("chat");

  return (
    <div className="max-w-full rounded-2xl px-4 py-3 bg-warning/10 border border-warning/30">
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t("capReached.title")}
          </p>
          <p className="text-xs mt-1 text-muted-foreground">
            {t("capReached.resetsAt", {
              date: formatTimestamp(capReached.resetAt, "MMM d, yyyy"),
            })}
          </p>
          <Button asChild variant="warning" size="sm" className="mt-3">
            <Link to="/settings/billing" search={{ success: false, canceled: false }}>
              {t("capReached.upgrade")}
              <ArrowUpRight size={12} />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
