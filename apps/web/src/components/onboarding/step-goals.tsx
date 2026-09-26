import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { StepProps } from "./types";

const PAIN_POINTS = [
  "invoicing",
  "projects",
  "clients",
  "cashflow",
  "pricing",
  "contracts",
  "taxes",
  "timeManagement",
  "marketing",
  "workLifeBalance",
  "other",
];

const HEARD_FROM = [
  "twitter",
  "google",
  "friend",
  "discord",
  "producthunt",
  "other",
];

export function StepGoals({ data, onChange }: StepProps) {
  const { t } = useTranslation("onboarding");

  function togglePainPoint(id: string) {
    const next = data.painPoints.includes(id)
      ? data.painPoints.filter((p) => p !== id)
      : [...data.painPoints, id];
    onChange({ painPoints: next });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">{t("goals.painPoint")}</p>
        <p className="mt-0.5 text-2xs text-muted-foreground">
          {t("goals.painPointHint")}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PAIN_POINTS.map((id) => {
          const selected = data.painPoints.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => togglePainPoint(id)}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-left text-xs font-medium leading-tight transition-colors",
                selected
                  ? "border-primary-border bg-primary-soft text-foreground"
                  : "border-input text-muted-foreground",
              )}
            >
              <span>{t(`goals.painPoints.${id}`)}</span>
            </button>
          );
        })}
      </div>
      {data.painPoints.includes("other") && (
        <Input
          value={data.painPointOther}
          onChange={(event) => onChange({ painPointOther: event.target.value })}
          placeholder={t("goals.otherPlaceholder")}
          className="h-9"
        />
      )}
      <div>
        <label className="sr-only" htmlFor="onboarding-heard-from">
          {t("marketing.heardFrom")}
        </label>
        <Select
          value={data.heardFrom || "__none__"}
          onValueChange={(value) =>
            onChange({ heardFrom: value === "__none__" ? "" : value })
          }
        >
          <SelectTrigger id="onboarding-heard-from" className="h-9 min-w-0">
            <SelectValue placeholder={t("marketing.sourcePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("marketing.heardFrom")}</SelectItem>
            {HEARD_FROM.map((source) => (
              <SelectItem key={source} value={source}>
                {t(`marketing.sources.${source}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
