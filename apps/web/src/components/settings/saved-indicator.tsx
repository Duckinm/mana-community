import { Check } from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function SavedIndicator({ show }: { show: boolean }) {
  const { t } = useTranslation("settings");
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-1 text-xs font-medium text-success"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          {t("saved")}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
