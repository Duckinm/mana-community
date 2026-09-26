import { Check, Copy } from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

const CHANGELOG = [
 {
 version: "v0.9.2",
 date: "Mar 24",
 title: "AI command centre improvements",
 desc: "Faster context loading, better invoice suggestions, memory persistence.",
 },
 {
 version: "v0.9.1",
 date: "Mar 18",
 title: "Kanban drag & drop (beta)",
 desc: "Move cards between columns. Keyboard accessible.",
 },
 {
 version: "v0.9.0",
 date: "Mar 10",
 title: "Light theme & manday calculator",
 desc: "Full light mode support, hourly-rate-to-manday evaluations on projects.",
 },
];

const MOCK_REFERRAL = "mana.app/r/you-xyz9";

function DiscordIcon() {
 return (
 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
 <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
 </svg>
 );
}

export function CommunityPanel() {
 const { t } = useTranslation("settings");
 const [copied, setCopied] = useState(false);

 function copyReferral() {
 navigator.clipboard.writeText(MOCK_REFERRAL);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }

 return (
 <div className="space-y-6">
 <div>
 <p className="text-xs font-semibold mb-3 text-muted-foreground">
 {t("community.discord")}
 </p>
 <div
 className="rounded-2xl p-4 flex items-center gap-4"
 style={{
 background: "rgba(88,101,242,0.08)",
 border: "1px solid rgba(88,101,242,0.2)",
 }}
 >
 <div
 className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
 style={{ background: "#5865F2" }}
 >
 <DiscordIcon />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-foreground">
 {t("community.communityName")}
 </p>
 <div className="flex items-center gap-3 mt-1">
 <span className="text-xs text-muted-foreground">{t("community.members", { count: 2412 })}</span>
 <span
 className="flex items-center gap-1 text-xs"
 style={{ color: "var(--category-green)" }}
 >
 <span className="w-1.5 h-1.5 rounded-full bg-[var(--category-green)] animate-pulse inline-block" />
 {t("community.online", { count: 84 })}
 </span>
 </div>
 </div>
 <button
 className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-95 shrink-0"
 style={{ background: "#5865F2", color: "#fff" }}
 >
 {t("community.join")}
 </button>
 </div>
 </div>

 <div>
 <p className="text-xs font-semibold mb-3 text-muted-foreground">
 {t("community.referralProgram")}
 </p>
 <div className="rounded-2xl p-4 space-y-3 bg-accent border border-border">
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-sm font-semibold text-foreground">
 {t("community.earnFreeMonths")}
 </p>
 <p className="text-xs mt-0.5 text-muted-foreground">
 {t("community.earnFreeMonthsDescription")}
 </p>
 </div>
 <Badge variant="soft" size="pill-sm">{t("community.referrals", { count: 0 })}</Badge>
 </div>
 <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl surface-card">
 <span className="text-xs font-mono truncate text-muted-foreground">
 {MOCK_REFERRAL}
 </span>
 <button
 onClick={copyReferral}
 className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-70 shrink-0"
 style={{ color: copied ? "var(--category-green)" : "var(--warning)" }}
 >
 {copied ? <Check size={11} /> : <Copy size={11} />}
 {copied ? t("community.copied") : t("community.copy")}
 </button>
 </div>
 </div>
 </div>

 <div>
 <p className="text-xs font-semibold mb-3 text-muted-foreground">
 {t("community.whatsNew")}
 </p>
 <div className="space-y-2">
 {CHANGELOG.map(({ version, date, title, desc }) => (
 <div
 key={version}
 className="flex gap-3 px-4 py-3 rounded-xl bg-accent border border-border"
 >
 <div className="shrink-0 pt-0.5">
 <Badge variant="code" size="sm">{version}</Badge>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p className="text-xs font-semibold text-foreground">
 {title}
 </p>
 <span className="text-2xs text-muted-foreground">
 {date}
 </span>
 </div>
 <p className="text-xs mt-0.5 leading-relaxed text-muted-foreground">
 {desc}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
