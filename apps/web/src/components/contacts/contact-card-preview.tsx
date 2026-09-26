import { colorFromName, generateInitials } from "@/components/contacts/contact-schema";
import { Mail, Phone } from "@/components/icons";
import { useTranslation } from "react-i18next";

interface ContactCardPreviewProps {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
}

/** Live contact-book card that fills in as the user types name/company/role in step 1. */
export function ContactCardPreview({
  name,
  role,
  company,
  email,
  phone,
}: ContactCardPreviewProps) {
  const { t } = useTranslation("contacts");
  const trimmed = name.trim();
  const color = trimmed ? colorFromName(trimmed) : "var(--text-faint)";
  const initials = trimmed ? generateInitials(trimmed) : "?";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border-default bg-surface-card p-4"
      style={{
        background: `linear-gradient(135deg, ${color}14, transparent 60%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full blur-2xl"
        style={{ background: `${color}22` }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-medium"
          style={{
            background: `linear-gradient(135deg, ${color}35, ${color}12)`,
            border: `1px solid ${color}40`,
            color,
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium leading-tight text-foreground">
            {trimmed || t("newContact.cardNamePlaceholder", { defaultValue: "New contact" })}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {role}
            {role && company ? " · " : ""}
            {company}
          </p>
        </div>
      </div>

      {(email || phone) && (
        <div className="relative mt-3 flex flex-col gap-1 border-t border-border-subtle pt-3">
          {email && (
            <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
              <Mail size={12} className="shrink-0 text-caption" />
              {email}
            </span>
          )}
          {phone && (
            <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
              <Phone size={12} className="shrink-0 text-caption" />
              {phone}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
