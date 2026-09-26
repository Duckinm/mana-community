import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  FileSignature,
  Flag,
  MessageSquare,
  Receipt,
  Upload,
  Users,
  Wallet,
} from "@/components/icons";
import { MobileHeadline } from "@/components/shells/mobile-headline";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet } from "@/components/ui/sheet";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { formatTimestamp } from "@/lib/timestamp";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useEffect, useState, type ElementType } from "react";
import { useTranslation } from "react-i18next";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  key: string | null;
  params: Record<string, string | number> | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

function notificationText(
  item: {
    title: string;
    body: string;
    key: string | null;
    params: Record<string, string | number> | null;
  },
  t: TFunction,
) {
  if (!item.key) return { title: item.title, body: item.body };
  const params: Record<string, string | number> = { ...item.params };
  if (typeof params.flags === "string") {
    params.reasons = params.flags
      .split(",")
      .map((flag) => t(`notifications.flags.${flag}`))
      .join("; ");
  }
  return {
    title: t(`notifications.items.${item.key}.title`, {
      ...params,
      defaultValue: item.title,
    }),
    body: t(`notifications.items.${item.key}.body`, {
      ...params,
      defaultValue: item.body,
    }),
  };
}

const CONTEXT_SUFFIX_RE = /\n\n— context: (.+)$/s;

function splitNotificationBody(body: string): {
  message: string;
  context: string | null;
} {
  const match = body.match(CONTEXT_SUFFIX_RE);
  if (!match) return { message: body, context: null };
  return {
    message: body.slice(0, match.index).trimEnd(),
    context: match[1]?.trim() || null,
  };
}

function notificationIcon(key: string | null): {
  Icon: ElementType;
  className: string;
} {
  if (!key) return { Icon: Bell, className: "bg-primary-soft text-primary" };
  if (key.startsWith("feedback")) {
    return { Icon: MessageSquare, className: "bg-primary-soft text-primary" };
  }
  if (key.startsWith("document") || key === "remindersSent") {
    return {
      Icon: FileSignature,
      className: "bg-primary-soft text-primary",
    };
  }
  if (key.startsWith("payment") || key === "paymentSlipUploaded") {
    return { Icon: Wallet, className: "bg-success-soft text-success" };
  }
  if (key.startsWith("budget")) {
    return { Icon: AlertCircle, className: "bg-warning-soft text-warning" };
  }
  if (key === "contactAdded") {
    return { Icon: Users, className: "bg-primary-soft text-primary" };
  }
  if (key === "eventReminder") {
    return { Icon: Calendar, className: "bg-primary-soft text-primary" };
  }
  if (key === "milestoneStatus") {
    return { Icon: Flag, className: "bg-primary-soft text-primary" };
  }
  if (key === "reconciliationFlagged" || key === "receiptReview") {
    return { Icon: Receipt, className: "bg-warning-soft text-warning" };
  }
  if (key.includes("Upload") || key.includes("upload")) {
    return { Icon: Upload, className: "bg-primary-soft text-primary" };
  }
  if (key.includes("Resolved") || key.includes("Accepted")) {
    return { Icon: CheckCircle2, className: "bg-success-soft text-success" };
  }
  return { Icon: Bell, className: "bg-primary-soft text-primary" };
}

function NotificationList({
  items,
  density,
  onSelect,
}: {
  items: NotificationItem[];
  density: "comfortable" | "compact";
  onSelect: (item: NotificationItem) => void;
}) {
  const { t } = useTranslation("common");
  const comfortable = density === "comfortable";

  if (items.length === 0) {
    return (
      <p
        className={cn(
          "text-center text-muted-foreground",
          comfortable ? "px-3 py-16 text-base" : "px-4 py-10 text-sm",
        )}
      >
        {t("notifications.empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {items.map((item) => {
        const text = notificationText(item, t);
        const { message, context } = splitNotificationBody(text.body);
        const { Icon, className } = notificationIcon(item.key);
        const unread = !item.readAt;

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                "flex w-full text-left transition-colors hover:bg-surface-raised/60 active:bg-surface-raised/60",
                comfortable ? "gap-3 px-2.5 py-4" : "gap-3 px-3 py-3.5",
                item.readAt && "opacity-70",
              )}
            >
              <span className="relative mt-0.5 shrink-0">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    className,
                  )}
                >
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                {unread && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-card bg-warning"
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "leading-snug text-foreground text-pretty",
                      comfortable ? "text-base" : "text-sm",
                      unread ? "font-semibold" : "font-medium",
                    )}
                  >
                    {text.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 pt-0.5 text-caption",
                      comfortable ? "text-sm" : "text-2xs",
                    )}
                  >
                    {formatTimestamp(item.createdAt, "d MMM yyyy")}
                  </span>
                </span>
                {message && (
                  <span
                    className={cn(
                      "mt-1.5 block text-muted-foreground text-pretty",
                      comfortable
                        ? "whitespace-pre-line text-[0.9375rem] leading-relaxed"
                        : "line-clamp-2 text-xs leading-relaxed",
                    )}
                  >
                    {message}
                  </span>
                )}
                {context && (
                  <span
                    className={cn(
                      "mt-2 block rounded-lg border border-border-subtle bg-surface-page text-caption text-pretty",
                      comfortable
                        ? "px-3 py-2.5 text-xs leading-relaxed"
                        : "line-clamp-1 px-2.5 py-1.5 text-2xs leading-snug",
                    )}
                  >
                    {context}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationBell({
  side = "top",
  align = "start",
  className,
}: {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
} = {}) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    function sync() {
      setIsMobile(media.matches);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const { data } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => expectEden(await client.api.notifications.get()),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) =>
      expectEden(await client.api.notifications({ id }).read.patch()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markAll = useMutation({
    mutationFn: async () =>
      expectEden(await client.api.notifications["read-all"].post()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const unread = data?.unread ?? 0;
  const items = (data?.items ?? []) as NotificationItem[];

  function handleSelect(item: NotificationItem) {
    if (!item.readAt) markRead.mutate(item.id);
    if (item.link) router.history.push(item.link);
    setOpen(false);
  }

  const trigger = (
    <button
      type="button"
      className={
        className ??
        "relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
      }
      aria-label={t("notifications.title")}
      aria-expanded={open}
      onClick={() => {
        if (isMobile) setOpen(true);
      }}
    >
      <Bell size={16} strokeWidth={1.5} />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[0.5625rem] font-semibold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet
          open={open}
          onOpenChange={setOpen}
          side="right"
          className="w-full max-w-none border-0 pb-[env(safe-area-inset-bottom)] xl:hidden"
          overlayClassName="xl:hidden"
        >
          <MobileHeadline
            title={t("notifications.title")}
            onBack={() => setOpen(false)}
            trailing={
              unread > 0 ? (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="truncate text-right text-sm font-medium text-primary"
                >
                  {t("notifications.markAllRead")}
                </button>
              ) : undefined
            }
          />

          <div
            className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <NotificationList
              items={items}
              density="comfortable"
              onSelect={handleSelect}
            />
          </div>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={12}
        collisionPadding={16}
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("notifications.title")}
          </span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
          <NotificationList
            items={items}
            density="compact"
            onSelect={handleSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
