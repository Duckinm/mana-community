import { passwordRules } from "@/components/auth/auth-schemas";
import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function PasswordChecklist({
  password,
  confirmPassword = "",
  showMatch = true,
}: {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
}) {
  const { t } = useTranslation("auth");
  const values = { password, confirmPassword };
  const rules = showMatch
    ? passwordRules
    : passwordRules.filter((r) => r.key !== "match");

  return (
    <ul className="space-y-1.5 my-4">
      {rules.map((rule) => {
        const passed = rule.test(values);
        return (
          <li
            key={rule.key}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors duration-base",
              passed ? "text-success" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border transition-colors duration-base",
                passed
                  ? "bg-success-soft border-success-border text-success"
                  : "border-border-subtle text-transparent",
              )}
            >
              <Check size={10} strokeWidth={3} />
            </span>
            {t(rule.labelKey)}
          </li>
        );
      })}
    </ul>
  );
}
