import { generateInitials } from "@/components/contacts/contact-schema";
import {
  SETTINGS_GROUPS,
  SETTINGS_SECTION_ROUTES,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "@/components/settings/settings-sections";
import { ChevronRight, LogOut } from "@/components/icons";
import { useSettings } from "@/context/settings";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

function sectionMeta(id: SettingsSectionId) {
  return SETTINGS_SECTIONS.find((section) => section.id === id)!;
}

export function SettingsHub({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const { t } = useTranslation("settings");
  const { user } = useSettings();
  const name = user?.name?.trim() || t("hub.accountFallback");
  const email = user?.email?.trim() || null;
  const avatarColor = user?.avatarColor ?? "#42b0a8";
  const avatarUrl = user?.image ?? null;
  const initials = generateInitials(name) || "?";

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <div
          className="flex size-16 items-center justify-center overflow-hidden rounded-full text-lg font-semibold"
          style={{
            background: avatarUrl ? "transparent" : `${avatarColor}33`,
            border: `1px solid ${avatarColor}55`,
            color: avatarColor,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-foreground">
            {name}
          </p>
          {email && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {email}
            </p>
          )}
        </div>
      </div>

      {SETTINGS_GROUPS.map((group) => (
        <section key={group.id} className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-foreground">
            {t(`hub.groups.${group.id}`)}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
            {group.sectionIds.map((id, index) => {
              const { icon: Icon } = sectionMeta(id);
              return (
                <Link
                  key={id}
                  to={SETTINGS_SECTION_ROUTES[id]}
                  className={cn(
                    "flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-raised active:bg-surface-raised",
                    index > 0 && "border-t border-border-subtle",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-muted-foreground">
                    <Icon size={15} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-left text-sm font-medium text-foreground">
                    {t(`sections.${id}.label`)}
                  </span>
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-muted-foreground"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
          <button
            type="button"
            onClick={onSignOut}
            className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-destructive/5 active:bg-destructive/5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <LogOut size={15} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-destructive">
              {t("signOut")}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
