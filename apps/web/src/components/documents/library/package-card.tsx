import { colorFor } from "@/components/documents/library/group-colors";
import {
  Eye,
  ImageIcon,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemTemplateGroup } from "@/hooks/use-item-template-groups";
import { formatTimestamp } from "@/lib/timestamp";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type PackageCardMember = {
  id: string;
  name: string;
  imageUrl: string | null;
  defaultQty: number;
  defaultUnitPriceCents: number;
  currency: string;
};

const STACK_MAX = 5;

function PackageImageStack({ members }: { members: PackageCardMember[] }) {
  const visible = members.slice(0, STACK_MAX);
  const overflow = members.length - STACK_MAX;

  if (members.length === 0) {
    return (
      <div className="flex size-8 items-center justify-center rounded-full border-2 border-surface-card bg-surface-raised">
        <ImageIcon
          size={14}
          className="text-muted-foreground/35"
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 -space-x-2">
      {visible.map((member, index) => (
        <div
          key={member.id}
          className="relative size-8 overflow-hidden rounded-full border-2 border-surface-card bg-muted shadow-sm"
          style={{ zIndex: visible.length - index }}
          title={member.name}
        >
          <span className="flex size-full items-center justify-center bg-surface-raised text-2xs font-semibold uppercase text-muted-foreground">
            {member.name.trim().charAt(0) || "?"}
          </span>
          {member.imageUrl && (
            <img
              src={member.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 size-full object-cover"
            />
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className="relative flex size-8 items-center justify-center rounded-full border-2 border-surface-card bg-surface-overlay text-2xs font-semibold text-foreground shadow-sm">
          +{overflow}
        </div>
      )}
    </div>
  );
}

export function PackageCard({
  group,
  members,
  active = false,
  onOpen,
  onEdit,
  onDelete,
}: {
  group: ItemTemplateGroup;
  members: PackageCardMember[];
  active?: boolean;
  onOpen: () => void;
  /** When present, the trailing three-dot icon opens a View/Edit/Delete menu. */
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation("documents");
  const color = colorFor(group.color);
  const iconColor = color.dot.replace("bg-", "text-");
  const itemCount = members.length;
  const description =
    group.description || (itemCount === 0 ? t("packageCard.noItemsYet") : "—");
  // with menus present, opening happens via menu/context menu — the row itself is inert
  const hasMenu = !!onEdit && !!onDelete;

  return (
    <button
      type="button"
      onClick={hasMenu ? undefined : onOpen}
      className={cn(
        "group flex min-h-[54px] w-full items-center gap-4 px-4 py-2 text-left transition-colors duration-fast hover:bg-surface-raised",
        hasMenu ? "cursor-default" : "cursor-pointer",
        active
          ? "bg-surface-raised"
          : "bg-surface-card",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg",
            color.bg,
          )}
        >
          {group.icon ? (
            <span
              aria-hidden
              className="flex size-[1.25rem] items-center justify-center text-[1.25rem] leading-none"
            >
              {group.icon}
            </span>
          ) : (
            <Package size={17} className={iconColor} strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {group.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <PackageImageStack members={members} />
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {formatTimestamp(group.updatedAt, "MMM d, yyyy")}
        </span>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span
                onClick={(e) => e.stopPropagation()}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-colors group-hover:bg-surface-overlay group-hover:text-foreground group-hover:opacity-100 xl:flex"
              >
                <MoreHorizontal size={16} />
              </span>
            </DropdownMenuTrigger>
            {/* row root is a button; portal events bubble through the React tree, so stop them here */}
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={onOpen}>
                <Eye size={14} strokeWidth={1.75} />
                {t("templateLibrary.view")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil size={14} strokeWidth={1.75} />
                {t("templateLibrary.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-danger focus:text-danger"
              >
                <Trash2 size={14} strokeWidth={1.75} />
                {t("templateLibrary.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </button>
  );
}

export function EmptyPackages({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation("documents");
  return (
    <div className="list-shell my-5 max-xl:mx-0 xl:mx-4 @xl:mx-6 @4xl:mx-10">
      <EmptyState
        icon={Package}
        title={t("packageCard.noPackagesYet")}
        description={t("packageCard.bundleDescription")}
        action={<Button type="button" variant="outline" size="sm" onClick={onNew}>
        <Plus size={14} strokeWidth={2} />
        {t("packageCard.createFirstPackage")}
        </Button>}
        className="px-4"
      />
    </div>
  );
}
