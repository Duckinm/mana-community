import { Row, Toggle } from "@/components/settings/shared";
import { useSettings } from "@/context/settings";
import { INTERFACE_SIZES, parseInterfaceSize, useTheme } from "@/context/theme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/context/language";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function AppearancePanel() {
  const { t } = useTranslation("settings");
  const { theme, setTheme, interfaceSize, setInterfaceSize } = useTheme();
  const { locale, setLocale } = useLanguage();
  const { user, saveFnRef, patchUser } = useSettings();

  const [animationsOn, setAnimationsOn] = useState(user?.animationsOn ?? true);
  const [hideBranding, setHideBranding] = useState(user?.hideBranding ?? false);

  useEffect(() => {
    if (!user) return;
    const val = user.animationsOn ?? true;
    setAnimationsOn(val);
    applyAnimations(val);
    setHideBranding(user.hideBranding ?? false);
  }, [user]);

  useEffect(() => {
    saveFnRef.current = () =>
      patchUser({ theme, animationsOn, hideBranding }).then(() => {});
    return () => {
      saveFnRef.current = null;
    };
  }, [theme, animationsOn, hideBranding, patchUser, saveFnRef]);

  function applyAnimations(val: boolean) {
    document.documentElement.setAttribute(
      "data-animations",
      val ? "on" : "off",
    );
  }

  function handleAnimationsChange(val: boolean) {
    setAnimationsOn(val);
    applyAnimations(val);
  }

  return (
    <div>
      <Row label={t("appearance.themeLabel")} sub={t("appearance.themeSub")}>
        <div className="inline-flex shrink-0 rounded-lg border border-border-subtle bg-surface-raised p-0.5">
          {(["auto", "light", "dark"] as const).map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={theme === option}
              onClick={() => setTheme(option)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                theme === option
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t(`appearance.${option}`)}
            </button>
          ))}
        </div>
      </Row>
      <Row
        label={t("appearance.interfaceSizeLabel")}
        sub={t("appearance.interfaceSizeSub")}
      >
        <Select
          value={interfaceSize}
          onValueChange={value => setInterfaceSize(parseInterfaceSize(value))}
        >
          <SelectTrigger
            size="sm"
            className="max-w-48"
            aria-label={t("appearance.interfaceSizeLabel")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERFACE_SIZES.map(size => (
              <SelectItem key={size} value={size}>
                {t(`appearance.interfaceSizes.${size}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      <Row
        label={t("appearance.languageLabel")}
        sub={t("appearance.languageSub")}
      >
        <button
          onClick={() => setLocale(locale === "en" ? "th" : "en")}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all duration-base hover:opacity-80 active:scale-95 bg-primary-soft border border-primary-border text-ink"
        >
          {locale === "en" ? t("appearance.english") : t("appearance.thai")}
        </button>
      </Row>
      <Row
        label={t("appearance.animationsLabel")}
        sub={t("appearance.animationsSub")}
      >
        <Toggle on={animationsOn} onChange={handleAnimationsChange} />
      </Row>
      <Row
        label={t("appearance.brandingLabel")}
        sub={t("appearance.brandingSub")}
      >
        <Toggle on={hideBranding} onChange={setHideBranding} />
      </Row>
    </div>
  );
}
