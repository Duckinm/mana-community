import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FolderKanban,
  HardDrive,
  Package,
  Receipt,
  Users,
  Wallet,
} from "@/components/icons";
import { ManaSparkle } from "@/components/icons/mana-sparkle";
import { MobileHeadline } from "@/components/shells/mobile-headline";
import { Sheet } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const sections = [
  {
    key: "finance",
    icon: Wallet,
    recipes: ["summary", "quarter", "expense", "tax", "profitability"],
  },
  {
    key: "invoices",
    icon: Receipt,
    recipes: ["unpaid", "overdue", "reminder", "owing"],
  },
  {
    key: "projects",
    icon: FolderKanban,
    recipes: ["active", "dueWeek", "overdueTasks", "breakdown", "create"],
  },
  {
    key: "contacts",
    icon: Users,
    recipes: ["weak", "outreach", "summarize", "add"],
  },
  {
    key: "library",
    icon: Package,
    recipes: ["templates", "addTemplate", "packages", "remark"],
  },
  {
    key: "storage",
    icon: HardDrive,
    recipes: ["usage", "find", "organize"],
  },
  {
    key: "assistant",
    icon: ManaSparkle,
    recipes: ["digest", "email", "overview"],
  },
] as const;

type CookbookDialogProps = {
  open: boolean;
  onClose: () => void;
  onPick: (text: string) => void;
};

function CookbookList({
  onPick,
  onClose,
}: {
  onPick: (text: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("chat");

  return (
    <div className="space-y-5">
      {sections.map(({ key, icon: Icon, recipes }) => (
        <div key={key}>
          <div className="mb-1.5 flex items-center gap-2 text-2xs font-medium uppercase tracking-wide text-caption">
            <Icon size={13} strokeWidth={1.75} />
            {t(`cookbook.${key}.label`)}
          </div>
          <div className="flex flex-col">
            {recipes.map((recipe) => {
              const text = t(`cookbook.${key}.${recipe}`);
              return (
                <button
                  key={recipe}
                  type="button"
                  onClick={() => {
                    onPick(text);
                    onClose();
                  }}
                  className="rounded-lg border border-transparent px-3 py-2.5 text-left text-sm text-foreground transition-colors duration-fast hover:border-border-subtle hover:bg-surface-raised active:bg-surface-raised"
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CookbookDialog({ open, onClose, onPick }: CookbookDialogProps) {
  const { t } = useTranslation("chat");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(next) => !next && onClose()}
        side="right"
        className="w-full max-w-none border-0 pb-[env(safe-area-inset-bottom)] xl:hidden"
        overlayClassName="xl:hidden"
      >
        <MobileHeadline title={t("cookbook.title")} onBack={onClose} />
        <div
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <p className="px-4 pt-3 text-sm text-muted-foreground">
            {t("cookbook.description")}
          </p>
          <div className="px-4 py-4">
            <CookbookList onPick={onPick} onClose={onClose} />
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{t("cookbook.title")}</DialogTitle>
          <DialogDescription>{t("cookbook.description")}</DialogDescription>
        </DialogHeader>
        <div className="-mx-2 flex-1 space-y-5 overflow-y-auto px-2">
          <CookbookList onPick={onPick} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
