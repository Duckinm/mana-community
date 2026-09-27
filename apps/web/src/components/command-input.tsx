import { useCapabilities } from '@/hooks/use-capabilities';
import { CapabilityNotice } from '@/components/capability-notice';
import { ArrowUp, File, Mic, Paperclip, Stop, X } from "@/components/icons";
import { useSettings } from "@/context/settings";
import {
  VoiceTranscriptionUnavailableError,
  appendSpeechTranscript,
  isVoiceRecordingSupported,
  startVoiceRecording,
  transcribeVoiceClip,
  type VoiceRecording,
  type VoiceRecordingStatus,
} from "@/lib/voice-recording";
import { motion } from "framer-motion";
import {
  type MutableRefObject,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const quickSuggestionKeys = [
  "runway",
  "overdueInvoices",
  "newProject",
  "summarizeWeek",
  "addContact",
  "storage",
] as const;

export type AttachedFile = {
  id: string;
  file: File;
  preview: string | null;
  isImage: boolean;
};

type CommandInputProps = {
  onSubmit: (text: string, files: AttachedFile[]) => void | boolean | Promise<void | boolean>;
  hasMessages: boolean;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  onSuggestionClick?: (text: string) => void;
  leftSlot?: React.ReactNode;
};

export const CommandInput = forwardRef<HTMLTextAreaElement, CommandInputProps>(
  function CommandInput(
    {
      onSubmit,
      hasMessages,
      disabled = false,
      isStreaming = false,
      onStop,
      onSuggestionClick,
      leftSlot,
    },
    ref,
  ) {
    const { t, i18n } = useTranslation("chat");
    const { user } = useSettings();
    const capabilities = useCapabilities();
    const [submitting, setSubmitting] = useState(false);
    disabled = disabled || submitting || capabilities.data?.ai !== true;

    const [input, setInput] = useState("");
    const [voiceStatus, setVoiceStatus] =
      useState<VoiceRecordingStatus>("idle");
    const [micHovered, setMicHovered] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recordingRef = useRef<VoiceRecording | null>(null);
    const voiceEnabled = user?.aiVoiceEnabled ?? false;
    const listening = voiceStatus === "starting" || voiceStatus === "listening";

    const setTextareaRef = useCallback(
      (el: HTMLTextAreaElement | null) => {
        textareaRef.current = el;
        if (typeof ref === "function") {
          ref(el);
        } else if (ref) {
          (ref as MutableRefObject<HTMLTextAreaElement | null>).current = el;
        }
      },
      [ref],
    );

    const adjustTextareaHeight = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    useLayoutEffect(() => {
      adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    useEffect(() => {
      return () => {
        for (const f of attachedFiles) {
          if (f.preview) URL.revokeObjectURL(f.preview);
        }
      };
    }, []);

    useEffect(() => {
      if (!voiceEnabled || disabled || isStreaming) {
        recordingRef.current?.stop();
        recordingRef.current = null;
      }
    }, [disabled, isStreaming, voiceEnabled]);

    useEffect(() => {
      return () => {
        recordingRef.current?.stop();
      };
    }, []);

    const handleSubmit = async () => {
      if (!input.trim() && attachedFiles.length === 0) return;
      if (disabled) return;
      recordingRef.current?.stop();
      recordingRef.current = null;
      setVoiceStatus("idle");
      setSubmitting(true);
      try {
        if (await onSubmit(input.trim(), attachedFiles) === false) return;
      } catch {
        toast.error(t("errorRetry"));
        return;
      } finally {
        setSubmitting(false);
      }
      setInput("");
      for (const f of attachedFiles) {
        if (f.preview) URL.revokeObjectURL(f.preview);
      }
      setAttachedFiles([]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (!selected.length) return;

      const remaining = 5 - attachedFiles.length;
      if (remaining <= 0) {
        toast.error(t("input.maxFilesError"));
        e.target.value = "";
        return;
      }

      const toAdd = selected.slice(0, remaining);
      if (selected.length > remaining) {
        toast.error(t("input.onlyNMoreFiles", { count: remaining }));
      }

      const newFiles: AttachedFile[] = toAdd.map((file) => {
        const isImage = file.type.startsWith("image/");
        return {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: isImage ? URL.createObjectURL(file) : null,
          isImage,
        };
      });

      setAttachedFiles((prev) => [...prev, ...newFiles]);
      e.target.value = "";
    };

    const removeFile = (id: string) => {
      setAttachedFiles((prev) => {
        const removed = prev.find((f) => f.id === id);
        if (removed?.preview) URL.revokeObjectURL(removed.preview);
        return prev.filter((f) => f.id !== id);
      });
    };

    const toggleListening = async () => {
      if (listening) {
        const recording = recordingRef.current;
        recordingRef.current = null;
        if (!recording) return;
        setVoiceStatus("transcribing");
        try {
          const blob = await recording.stop();
          const language = i18n.resolvedLanguage?.startsWith("th")
            ? "th"
            : "en";
          const transcript = await transcribeVoiceClip(blob, language);
          if (transcript.trim()) {
            setInput((current) => appendSpeechTranscript(current, transcript));
            textareaRef.current?.focus();
          }
          setVoiceStatus("idle");
        } catch (err) {
          setVoiceStatus("error");
          toast.error(
            err instanceof VoiceTranscriptionUnavailableError
              ? t("input.voiceUnavailable")
              : t("input.voiceError"),
          );
        }
        return;
      }

      if (capabilities.data?.transcription !== true) return;

      if (!isVoiceRecordingSupported()) {
        setVoiceStatus("unsupported");
        toast.error(t("input.voiceUnsupported"));
        return;
      }

      setVoiceStatus("starting");
      try {
        recordingRef.current = await startVoiceRecording();
        setVoiceStatus("listening");
      } catch {
        setVoiceStatus("error");
        toast.error(t("input.voicePermissionError"));
      }
    };

    return (
      <div className="w-full max-w-2xl">
        <CapabilityNotice available={capabilities.data?.ai} unavailableKey="aiUnavailable" availableKey={voiceEnabled && capabilities.data?.transcription ? "aiVoiceCost" : "aiCost"} />
        {voiceEnabled && capabilities.data?.ai && <CapabilityNotice available={capabilities.data?.transcription} unavailableKey="transcriptionUnavailable" />}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-input bg-card">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachedFiles.map((af) => (
                <div
                  key={af.id}
                  className="relative flex items-center gap-1.5 rounded-lg border border-input bg-surface-raised pr-1.5 pl-1.5 py-1"
                >
                  {af.isImage && af.preview ? (
                    <img
                      src={af.preview}
                      alt={af.file.name}
                      className="h-8 w-8 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-card shrink-0">
                      <File size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  {!af.isImage && (
                    <span className="max-w-[120px] truncate text-xs text-foreground">
                      {af.file.name}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(af.id)}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
                    aria-label={t("input.removeFile", { name: af.file.name })}
                  >
                    <X size={9} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={setTextareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" && !e.shiftKey) {
                // Soft keyboards have no Shift — Enter must insert a newline.
                // Desktop keeps Enter-to-send; use the send button on mobile.
                const softKeyboard =
                  window.matchMedia("(pointer: coarse)").matches ||
                  window.matchMedia("(max-width: 1023px)").matches;
                if (softKeyboard) return;
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === "Escape" && isStreaming) {
                e.preventDefault();
                onStop?.();
              }
            }}
            rows={1}
            placeholder={t("input.placeholder")}
            disabled={disabled || isStreaming}
            className="min-h-14 w-full min-w-0 resize-none overflow-hidden bg-transparent px-4 pt-4 pb-2 text-base leading-normal text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-0 disabled:opacity-60"
          />
          <div className="flex shrink-0 items-center gap-2 border-t border-input px-2 py-2 bg-card">
            {leftSlot}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={disabled || isStreaming}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-base"
              style={{
                background:
                  attachedFiles.length > 0
                    ? "var(--primary-soft)"
                    : "var(--surface-raised)",
                border: `1px solid ${attachedFiles.length > 0 ? "var(--primary-border)" : "var(--border-subtle)"}`,
              }}
              aria-label={t("input.attachFiles")}
            >
              <Paperclip
                size={15}
                className={
                  attachedFiles.length > 0 ? "text-primary" : "text-foreground"
                }
                strokeWidth={1.5}
              />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              {voiceEnabled && (
                <button
                  type="button"
                  onClick={toggleListening}
                  onMouseEnter={() => setMicHovered(true)}
                  onMouseLeave={() => setMicHovered(false)}
                  disabled={
                    disabled || isStreaming || capabilities.data?.transcription !== true || voiceStatus === "transcribing"
                  }
                  aria-label={
                    listening ? t("input.voiceStop") : t("input.voiceStart")
                  }
                  aria-pressed={listening}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-base disabled:opacity-30"
                  style={{
                    background:
                      listening || micHovered
                        ? "rgba(239, 68, 68, 0.15)"
                        : "var(--surface-raised)",
                    border: `1px solid ${listening || micHovered ? "rgba(239, 68, 68, 0.4)" : "var(--border-subtle)"}`,
                  }}
                >
                  {listening && (
                    <span
                      className="absolute inset-0 rounded-xl opacity-30 animate-ping"
                      style={{ border: "1px solid rgb(239, 68, 68)" }}
                    />
                  )}
                  <Mic
                    size={15}
                    color={
                      listening || micHovered ? "rgb(239, 68, 68)" : undefined
                    }
                    className={
                      listening || micHovered ? undefined : "text-foreground"
                    }
                    strokeWidth={listening ? 2.5 : 1.5}
                  />
                </button>
              )}
              {voiceEnabled && (
                <span className="sr-only" aria-live="polite">
                  {t(`input.voiceStatus.${voiceStatus}`)}
                </span>
              )}
              <button
                type="button"
                onClick={isStreaming ? onStop : handleSubmit}
                disabled={
                  isStreaming
                    ? false
                    : (!input.trim() && attachedFiles.length === 0) || disabled
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-base disabled:opacity-30"
                style={{
                  background: isStreaming
                    ? "var(--surface-raised)"
                    : input.trim() || attachedFiles.length > 0
                      ? "var(--warning)"
                      : "var(--surface-raised)",
                  border: isStreaming
                    ? "1px solid var(--border-subtle)"
                    : "1px solid transparent",
                }}
                aria-label={isStreaming ? t("input.stop") : t("input.send")}
              >
                {isStreaming ? (
                  <Stop size={14} className="text-foreground" weight="fill" />
                ) : (
                  <ArrowUp
                    size={16}
                    color={
                      input.trim() || attachedFiles.length > 0
                        ? "var(--primary-foreground)"
                        : "var(--text-primary)"
                    }
                    strokeWidth={2.5}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {!hasMessages && !disabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="hidden md:flex flex-wrap gap-2 mt-4 justify-center"
          >
            {quickSuggestionKeys.map((key) => {
              const s = t(`suggestions.${key}`);
              return (
                <button
                  key={key}
                  onClick={() =>
                    onSuggestionClick ? onSuggestionClick(s) : setInput(s)
                  }
                  className="text-xs px-3.5 py-2 rounded-full transition-colors bg-card border border-input text-muted-foreground hover:text-foreground hover:border-border"
                >
                  {s}
                </button>
              );
            })}
          </motion.div>
        )}
      </div>
    );
  },
);
