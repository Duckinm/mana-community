import { Check, CheckCircle2, ListBullets, Sparkle } from "@/components/icons";
import { GetStartedChecklistSkeleton } from "@/components/onboarding/get-started-checklist-skeleton";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { ProfileRewardFinish } from "@/components/onboarding/profile-reward-finish";
import { completeProfileForAiCredit } from "@/components/onboarding/draft";
import {
  STEP_ICONS,
  STEP_KEYS,
  TOTAL_STEPS,
  navigateToStep,
  useGetStarted,
  type StepKey,
} from "@/components/onboarding/get-started-steps";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motionDurations, motionTransition } from "@/lib/motion";
import { queryKeys } from "@/lib/query-keys";
import { sidebarRowHoverHandlers } from "@/lib/sidebar-row-hover";
import { cn } from "@/lib/utils";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const CELEBRATE_MS = 2600;

const SPARKLES = [
  { className: "-top-1.5 -right-1.5 text-warning", size: 8, delay: 0 },
  { className: "-bottom-1 -left-1.5 text-primary", size: 6, delay: 2.4 },
  { className: "-top-1 -left-2 text-category-purple", size: 5, delay: 4.6 },
] as const;

function SparkleAccents() {
  return (
    <span className="pointer-events-none" aria-hidden>
      {SPARKLES.map(({ className, size, delay }) => (
        <motion.span
          key={className}
          className={cn("absolute flex", className)}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], rotate: [0, 24, 0] }}
          transition={{
            duration: 1.5,
            delay,
            repeat: Infinity,
            repeatDelay: 5.5,
            ease: "easeInOut",
          }}
        >
          <Sparkle size={size} weight="fill" />
        </motion.span>
      ))}
    </span>
  );
}

function StepRow({
  stepKey,
  done,
  t,
  onClick,
}: {
  stepKey: StepKey;
  done: boolean;
  t: TFunction;
  onClick: (key: StepKey) => void;
}) {
  const Icon = STEP_ICONS[stepKey];
  return (
    <button
      type="button"
      disabled={done}
      onClick={() => onClick(stepKey)}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border-subtle px-3.5 py-2.5 text-left transition-colors last:border-b-0",
        done ? "cursor-default" : "cursor-pointer hover:bg-surface-raised",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          done ? "bg-success-soft text-success" : "bg-surface-raised text-muted-foreground",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={motionTransition(motionDurations.fast)}
              className="flex"
            >
              <Check size={13} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={motionTransition(motionDurations.fast)}
              className="flex"
            >
              <Icon size={13} strokeWidth={1.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[0.8125rem] font-medium",
            done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {t(`getStarted.steps.${stepKey}.title`)}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {t(`getStarted.steps.${stepKey}.description`)}
        </span>
      </span>
    </button>
  );
}

function ChecklistPanel({
  done,
  hasProfile,
  completed,
  celebrating,
  t,
  onStepClick,
  onProfileClick,
  onHide,
}: {
  done: Record<StepKey, boolean>;
  hasProfile: boolean;
  completed: number;
  celebrating: boolean;
  t: TFunction;
  onStepClick: (key: StepKey) => void;
  onProfileClick: () => void;
  onHide: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {celebrating ? t("getStarted.completeTitle") : t("getStarted.popoverTitle")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {celebrating ? t("getStarted.completeSubtitle") : t("getStarted.popoverSubtitle")}
          </p>
        </div>
        <motion.span
          key={completed}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionTransition(motionDurations.fast)}
          className="shrink-0 rounded-full border border-primary-border bg-primary-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-primary"
        >
          {t("getStarted.badge", { completed, total: TOTAL_STEPS })}
        </motion.span>
      </div>
      <div className="flex flex-col">
        {STEP_KEYS.map((key) => (
          <StepRow key={key} stepKey={key} done={done[key]} t={t} onClick={onStepClick} />
        ))}
        <button
          type="button"
          disabled={hasProfile}
          onClick={onProfileClick}
          className={cn(
            "flex w-full items-start gap-3 border-b border-border-subtle px-3.5 py-2.5 text-left transition-colors",
            hasProfile ? "cursor-default" : "cursor-pointer hover:bg-surface-raised",
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
              hasProfile ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
            )}
          >
            {hasProfile ? <Check size={13} strokeWidth={2.5} /> : <Sparkle size={13} weight="fill" />}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block text-[0.8125rem] font-medium",
                hasProfile ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {t("getStarted.profile.title")}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {t("getStarted.profile.description")}
            </span>
          </span>
          {!hasProfile && (
            <span className="mt-0.5 rounded-full border border-primary-border bg-primary-soft px-1.5 py-0.5 text-2xs font-semibold text-primary">
              {t("getStarted.profile.credit")}
            </span>
          )}
        </button>
      </div>
      <div className="flex items-center justify-end border-t border-border px-3.5 py-2">
        <button
          type="button"
          onClick={onHide}
          className="text-2xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("getStarted.hide")}
        </button>
      </div>
    </div>
  );
}

export function GetStartedChecklist({ collapsed }: { collapsed: boolean }) {
  const { userId } = useRouteContext({ from: "/_app" });
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const dismissedKey = `get-started:dismissed:${userId}`;
  const shownKey = `get-started:shown:${userId}`;

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(dismissedKey) === "1",
  );
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data, isPending, done, completed } = useGetStarted(!dismissed);
  const alreadyShownBefore = localStorage.getItem(shownKey) === "1";
  const checklistComplete = completed === TOTAL_STEPS && Boolean(data?.hasProfile);
  const hideSilently = !dismissed && !!data && checklistComplete && !alreadyShownBefore;

  useEffect(() => {
    if (dismissed || !data) return;
    if (checklistComplete) {
      if (!alreadyShownBefore) {
        localStorage.setItem(dismissedKey, "1");
        setDismissed(true);
        return;
      }
      setCelebrating(true);
      const timeout = setTimeout(() => {
        localStorage.setItem(dismissedKey, "1");
        setDismissed(true);
      }, CELEBRATE_MS);
      return () => clearTimeout(timeout);
    }
    if (!alreadyShownBefore) localStorage.setItem(shownKey, "1");
  }, [data, checklistComplete, dismissed, alreadyShownBefore, dismissedKey, shownKey]);

  function handleHide() {
    localStorage.setItem(dismissedKey, "1");
    setDismissed(true);
    setOpen(false);
  }

  function handleStepClick(key: StepKey) {
    if (done[key]) return;
    setOpen(false);
    navigateToStep(navigate, key);
  }

  function handleProfileComplete() {
    setProfileOpen(false);
    void queryClient.invalidateQueries({ queryKey: queryKeys.getStarted });
    void queryClient.invalidateQueries({ queryKey: queryKeys.user });
    void queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
  }

  if (dismissed || hideSilently) return null;

  const triggerButton = (
    <button
      type="button"
      className="mx-2 flex h-8 items-center gap-2.5 rounded-md px-2.5 transition-colors"
      style={{
        color: celebrating ? "var(--success)" : "var(--text-muted)",
        width: collapsed ? 32 : "calc(100% - 16px)",
        justifyContent: collapsed ? "center" : undefined,
        paddingLeft: collapsed ? 0 : undefined,
        paddingRight: collapsed ? 0 : undefined,
      }}
      {...sidebarRowHoverHandlers}
    >
      <AnimatePresence mode="wait" initial={false}>
        {celebrating ? (
          <motion.span
            key="done"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={motionTransition(motionDurations.fast)}
            className="flex shrink-0"
          >
            <CheckCircle2 size={16} strokeWidth={1.5} />
          </motion.span>
        ) : (
          <motion.span
            key="icon"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={motionTransition(motionDurations.fast)}
            className="relative flex shrink-0"
          >
            <motion.span
              className="flex"
              animate={{ rotate: [0, -10, 10, -6, 0] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 6.8,
                ease: "easeInOut",
              }}
            >
              <ListBullets size={16} strokeWidth={1.5} />
            </motion.span>
            <SparkleAccents />
            {collapsed && !!data && completed < TOTAL_STEPS && (
              <span className="absolute -right-1 -top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-primary px-0.5 text-[0.5rem] font-semibold text-primary-foreground">
                {completed}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && (
        <>
          <span className="flex-1 overflow-hidden whitespace-nowrap text-left text-[0.8125rem] font-normal">
            {celebrating ? t("getStarted.completeTitle") : t("getStarted.navLabel")}
          </span>
          {!celebrating && !!data && (
            <motion.span
              key={completed}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition(motionDurations.fast)}
              className="shrink-0 rounded-full border border-primary-border bg-primary-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-primary"
            >
              {t("getStarted.badge", { completed, total: TOTAL_STEPS })}
            </motion.span>
          )}
        </>
      )}
    </button>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {celebrating
              ? t("getStarted.completeTitle")
              : `${t("getStarted.navLabel")} ${data ? t("getStarted.badge", { completed, total: TOTAL_STEPS }) : ""}`}
          </TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      )}
      <PopoverContent side="right" align="start" sideOffset={8} className="w-80 p-0">
        {isPending ? (
          <GetStartedChecklistSkeleton />
        ) : (
          <ChecklistPanel
            done={done}
            hasProfile={data?.hasProfile ?? false}
            completed={completed}
            celebrating={celebrating}
            t={t}
            onStepClick={handleStepClick}
            onProfileClick={() => {
              setOpen(false);
              setProfileOpen(true);
            }}
            onHide={handleHide}
          />
        )}
      </PopoverContent>
      </Popover>
      {profileOpen && (
        <OnboardingFlow
          onDismiss={() => setProfileOpen(false)}
          finalStep={(profile) => <ProfileRewardFinish data={profile} />}
          onSubmit={completeProfileForAiCredit}
          onComplete={handleProfileComplete}
          submitLabel={t("profileReward.claim")}
          canSubmit={(profile) => Boolean(profile.freelancerType)}
        />
      )}
    </>
  );
}
