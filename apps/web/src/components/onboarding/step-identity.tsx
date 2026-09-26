import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Minus, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { freelancerJobs, getFreelancerJobBySlug } from "@/lib/freelancer-jobs";
import { cn } from "@/lib/utils";
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  RATE_RANGES,
  availableRevenueGoals,
  formatRateRange,
} from "./rate-ranges";
import type { StepProps } from "./types";

const PROJECT_MIN = 1;
const PROJECT_MAX = 100;

export function StepIdentity({ data, onChange }: StepProps) {
  const { t } = useTranslation("onboarding");
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const selectedJob = getFreelancerJobBySlug(data.freelancerType);
  const symbol = CURRENCY_SYMBOLS[data.currency] ?? data.currency;
  const revenueGoals = availableRevenueGoals(data.hourlyRate);
  const projectCount = Number(data.activeProjects) || PROJECT_MIN;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="normal-case tracking-normal text-xs">
          {t("identity.iAmA")}
        </Label>
        <Popover open={jobPickerOpen} onOpenChange={setJobPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={jobPickerOpen}
              className="h-9 w-full justify-between font-normal"
            >
              <span className={selectedJob ? "" : "text-muted-foreground"}>
                {selectedJob
                  ? selectedJob.nameEn
                  : t("identity.jobPlaceholder")}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[--radix-popover-trigger-width] p-0"
          >
            <Command>
              <CommandInput placeholder={t("identity.jobSearch")} />
              <CommandList onWheel={(e) => e.stopPropagation()}>
                <CommandEmpty>{t("identity.jobEmpty")}</CommandEmpty>
                {freelancerJobs.map((job) => (
                  <CommandItem
                    key={job.slug}
                    value={`${job.nameEn} ${job.nameTh}`}
                    onSelect={() => {
                      onChange({ freelancerType: job.slug });
                      setJobPickerOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        job.slug === data.freelancerType
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="font-medium">{job.nameEn}</span>
                    <span className="truncate text-muted-foreground">
                      {job.nameTh}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedJob?.slug === "other" && (
          <Input
            value={data.freelancerTypeOther}
            onChange={(e) => onChange({ freelancerTypeOther: e.target.value })}
            placeholder={t("identity.otherPlaceholder")}
            className="h-9"
          />
        )}
      </div>

      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-3">
        <Label className="normal-case tracking-normal text-xs">
          {t("identity.hourlyRate")}
        </Label>
        <div className="flex min-w-0 gap-1.5">
          <Select
            value={data.currency}
            onValueChange={(v) => onChange({ currency: v })}
          >
            <SelectTrigger className="h-9 w-24 shrink-0 [&>span]:line-clamp-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {CURRENCY_SYMBOLS[currency]} {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={data.hourlyRate}
            onValueChange={(v) => onChange({ hourlyRate: v })}
          >
            <SelectTrigger className="h-9 min-w-0 flex-1">
              <SelectValue placeholder={t("identity.rangePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {RATE_RANGES.map((range) => (
                <SelectItem key={range.id} value={range.id}>
                  {formatRateRange(range.id, symbol)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Label className="normal-case tracking-normal text-xs">
          {t("identity.revenueGoal")}
        </Label>
        <Select
          value={data.revenueGoal}
          onValueChange={(v) => onChange({ revenueGoal: v })}
        >
          <SelectTrigger className="h-9 min-w-0">
            <SelectValue placeholder={t("identity.revenueGoalPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {revenueGoals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {symbol}
                {goal.amount.toLocaleString()} {t("identity.perMonth")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Label className="normal-case tracking-normal text-xs">
          {t("identity.activeProjects")}
        </Label>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={t("identity.projectsDecrease")}
            disabled={projectCount <= PROJECT_MIN}
            onClick={() =>
              onChange({
                activeProjects: String(Math.max(PROJECT_MIN, projectCount - 1)),
              })
            }
            className="flex size-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
          >
            <Minus size={12} />
          </button>
          <span className="w-7 text-center font-mono text-sm tabular-nums text-foreground">
            {projectCount}
          </span>
          <button
            type="button"
            aria-label={t("identity.projectsIncrease")}
            disabled={projectCount >= PROJECT_MAX}
            onClick={() =>
              onChange({
                activeProjects: String(Math.min(PROJECT_MAX, projectCount + 1)),
              })
            }
            className="flex size-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
