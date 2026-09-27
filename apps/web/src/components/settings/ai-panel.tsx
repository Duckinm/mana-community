import { useCapabilities } from "@/hooks/use-capabilities";
import { CapabilityNotice } from "@/components/capability-notice";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { Row, Toggle } from "@/components/settings/shared";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/settings";
import { client, expectEden } from "@/lib/eden";
import { ManaSparkle } from "@/components/icons/mana-sparkle";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { UserPrefs } from "@/lib/user-types";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function AIPanel() {
  const capabilities = useCapabilities();
  const queryClient = useQueryClient();
  const { t } = useTranslation("settings");
  const { user, saveFnRef, patchUser } = useSettings();

  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [memory, setMemory] = useState(user?.aiMemory ?? true);
  const [proactive, setProactive] = useState(user?.aiProactive ?? true);
  const [voiceEnabled, setVoiceEnabled] = useState(
    user?.aiVoiceEnabled ?? false,
  );
  const [tone, setTone] = useState<"concise" | "balanced" | "detailed">(
    (user?.aiTone as "concise" | "balanced" | "detailed") ?? "balanced",
  );
  useEffect(() => {
    if (!user) return;
    setMemory(user.aiMemory ?? true);
    setProactive(user.aiProactive ?? true);
    setVoiceEnabled(user.aiVoiceEnabled ?? false);
    setTone((user.aiTone as "concise" | "balanced" | "detailed") ?? "balanced");
  }, [user]);

  const copyMcpSetup = useCallback(() => {
    if (!user?.mcpToken) return;
    const apiUrl = resolveApiBaseUrl();
    navigator.clipboard.writeText(
      `MANA MCP connection\n\n1. Save this private token as MANA_MCP_TOKEN:\nMANA_MCP_TOKEN=${user.mcpToken}\n\n2. Connect your MCP client to:\n${apiUrl}/mcp\n\n3. Send this header with each request:\nAuthorization: Bearer $MANA_MCP_TOKEN`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [user?.mcpToken]);

  const regenerateToken = useCallback(async () => {
    if (!confirmRegen) {
      setConfirmRegen(true);
      setTimeout(() => setConfirmRegen(false), 4000);
      return;
    }
    setRegenerating(true);
    setConfirmRegen(false);
    try {
      const result = expectEden(
        await client.api.users["mcp-token"].regenerate.post(),
      );
      const rotatedAt = result.mcpTokenRotatedAt;
      queryClient.setQueryData<UserPrefs | undefined>(queryKeys.user, (prev) =>
        prev
          ? {
              ...prev,
              mcpToken: result.mcpToken,
              mcpTokenRotatedAt: rotatedAt ? new Date(rotatedAt).toISOString() : null,
            }
          : prev,
      );
    } finally {
      setRegenerating(false);
    }
  }, [confirmRegen, queryClient]);

  useEffect(() => {
    saveFnRef.current = () =>
      patchUser({
        aiMemory: memory,
        aiProactive: proactive,
        aiVoiceEnabled: voiceEnabled,
        aiTone: tone,
      }).then(() => {});
    return () => {
      saveFnRef.current = null;
    };
  }, [memory, proactive, voiceEnabled, tone, patchUser, saveFnRef]);

  return (
    <div>
      <CapabilityNotice available={capabilities.data?.ai} unavailableKey="aiUnavailable" availableKey="aiCost" />
      <CapabilityNotice available={capabilities.data?.transcription} unavailableKey="transcriptionUnavailable" availableKey="voiceCost" />
      <Row label={t("ai.model")} sub={t("ai.modelSub")}>
        <span
          className="text-xs px-3 py-1.5 max-w-max rounded-full flex items-center gap-1.5"
          style={{
            background: "var(--primary-soft)",
            border: "1px solid var(--primary-border)",
            color: "var(--primary)",
          }}
        >
          <ManaSparkle size={10} />
          {t("ai.modelAuto")}
        </span>
      </Row>
      <Row label={t("ai.responseTone")}>
        <div className="flex rounded-lg max-w-max overflow-hidden border border-input">
          {(["concise", "balanced", "detailed"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setTone(opt)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                background: tone === opt ? "var(--primary-soft)" : "transparent",
                color: tone === opt ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {t(`ai.tone${opt.charAt(0).toUpperCase()}${opt.slice(1)}`)}
            </button>
          ))}
        </div>
      </Row>
      <Row label={t("ai.memory")} sub={t("ai.memorySub")}>
        <Toggle on={memory} onChange={setMemory} />
      </Row>
      <Row
        label={t("ai.proactive")}
        sub={t("ai.proactiveSub")}
      >
        <Toggle on={proactive} onChange={setProactive} />
      </Row>
      <Row label={t("ai.voiceInput")} sub={t("ai.voiceInputSub")}>
        <Toggle on={voiceEnabled} onChange={setVoiceEnabled} disabled={capabilities.isError || !capabilities.data?.transcription} />
      </Row>
      <div
        className="mt-6 rounded-xl p-4"
        style={{
          background: "var(--primary-soft)",
          border: "1px solid var(--primary-border)",
        }}
      >
        <p className="text-xs text-primary font-semibold mb-1">
          {t("ai.contextWindowTitle")}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("ai.contextWindowDescription")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("ai.modelTransparency")}{" "}
          <a
            href="https://heymana.app/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {t("ai.modelTransparencyLink")}
          </a>
          .
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Row label={t("ai.mcpConnection")} sub={t("ai.mcpConnectionSub")}>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono truncate max-w-[140px] bg-secondary text-foreground">
              {user?.mcpToken ? `${user.mcpToken.slice(0, 8)}…` : "—"}
            </code>
            <Button
              variant="outline"
              size="sm"
              disabled={!user?.mcpToken}
              onClick={copyMcpSetup}
            >
              {copied ? t("ai.copied") : t("ai.copySetup")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!user?.mcpToken || regenerating}
              onClick={regenerateToken}
              className={
                confirmRegen
                  ? "border-destructive text-destructive hover:bg-destructive/10"
                  : ""
              }
            >
              {regenerating
                ? t("ai.regenerating")
                : confirmRegen
                  ? t("ai.confirmRegen")
                  : t("ai.regenerate")}
            </Button>
          </div>
        </Row>
        <p className="text-xs text-muted-foreground px-1">
          <a
            href="https://heymana.app/docs/mcp/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {t("ai.mcpDocsLink")}
          </a>
        </p>
        {user?.mcpTokenRotatedAt && (
          <p className="text-xs text-muted-foreground px-1">
            {t("ai.lastRotated", {
              days: Math.floor(
                (Date.now() - new Date(user.mcpTokenRotatedAt).getTime()) /
                  86_400_000,
              ),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
