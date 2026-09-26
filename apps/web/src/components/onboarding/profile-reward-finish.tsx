import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkle } from "@/components/icons";
import type { OnboardingData } from "@/components/onboarding/types";

export function ProfileRewardFinish({ data }: { data: OnboardingData }) {
  const { t } = useTranslation("onboarding");
  const hasRole = Boolean(data.freelancerType);

  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary-border bg-primary-soft text-primary"
      >
        <Sparkle size={26} weight="fill" />
      </motion.div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("profileReward.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("profileReward.subtitle")}
        </p>
      </div>
      <div className="rounded-2xl border border-primary-border bg-primary-soft px-5 py-4 text-left">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 size={17} weight="fill" />
          <p className="text-sm font-semibold">{t("profileReward.creditTitle")}</p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {t("profileReward.creditDescription")}
        </p>
      </div>
      {!hasRole && (
        <p className="text-xs text-destructive">{t("profileReward.roleRequired")}</p>
      )}
    </div>
  );
}
