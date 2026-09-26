import type { EntityType } from "@/components/contacts/contact-schema";
import { Landmark, User } from "@/components/icons";
import { useTranslation } from "react-i18next";

interface EntityTypeToggleProps {
  value: EntityType;
  onChange: (value: EntityType) => void;
}

const OPTIONS: { value: EntityType; icon: typeof User; key: string }[] = [
  { value: "individual", icon: User, key: "persona.entityIndividual" },
  { value: "company", icon: Landmark, key: "persona.entityCompany" },
];

/** Person / Company toggle cards — selection swaps which tax fields the form shows. */
export function EntityTypeToggle({ value, onChange }: EntityTypeToggleProps) {
  const { t } = useTranslation("contacts");
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map(({ value: v, icon: Icon, key }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors duration-base ${
              active
                ? "border-primary-border bg-primary-soft text-primary"
                : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} strokeWidth={2} />
            <span className="text-xs font-semibold">{t(key)}</span>
          </button>
        );
      })}
    </div>
  );
}
