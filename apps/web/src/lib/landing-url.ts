import i18next from "@/lib/i18n";

/** Link into the marketing site, keeping the user's language (/th/... for Thai). */
export function landingUrl(path: string) {
  const prefix = i18next.language === "th" ? "/th" : "";
  return `https://heymana.app${prefix}${path}`;
}
