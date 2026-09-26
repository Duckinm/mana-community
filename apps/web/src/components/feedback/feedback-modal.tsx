import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { client, expectEden } from "@/lib/eden";
import { cn } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { Bug, CircleHelp, Lightbulb, MessageSquare } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useTheme } from "@/context/theme";
import { FeedbackCharRing } from "@/components/feedback/feedback-char-ring";
import {
  FeedbackScreenshotAttach,
  type FeedbackScreenshot,
} from "@/components/feedback/feedback-screenshot-attach";
import { FeedbackReferenceChip } from "@/components/feedback/feedback-reference-chip";

const MESSAGE_MAX = 4000;
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.0.1";

const feedbackSchema = z.object({
  type: z.enum(["bug", "idea", "question", "other"]),
  message: z.string().trim().min(1).max(MESSAGE_MAX),
});

type FeedbackValues = z.infer<typeof feedbackSchema>;
type FeedbackRecord = NonNullable<
  Awaited<ReturnType<typeof client.api.feedback.post>>["data"]
>;

const TYPE_OPTIONS = [
  { value: "bug", icon: Bug, labelKey: "feedback.typeBug" },
  { value: "idea", icon: Lightbulb, labelKey: "feedback.typeIdea" },
  { value: "question", icon: CircleHelp, labelKey: "feedback.typeQuestion" },
  { value: "other", icon: MessageSquare, labelKey: "feedback.typeOther" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const [screenshot, setScreenshot] = useState<FeedbackScreenshot | null>(null);
  const [submitted, setSubmitted] = useState<FeedbackRecord | null>(null);

  const submit = useMutation({
    mutationFn: async (values: FeedbackValues) => {
      const context = `\n\n— context: ${pathname} · v${APP_VERSION} · ${theme} theme${screenshot ? " · screenshot attached (not uploaded — pending API support)" : ""}`;
      return expectEden(
        await client.api.feedback.post({
          ...values,
          message: `${values.message}${context}`,
          pagePath: pathname,
        }),
      );
    },
    onSuccess: (data) => setSubmitted(data),
    onError: () => toast.error(t("feedback.error")),
  });

  const form = useForm({
    defaultValues: { type: "idea", message: "" } as FeedbackValues,
    validators: { onSubmit: feedbackSchema },
    onSubmit: ({ value }) => submit.mutate(value),
  });

  const resetAndClose = () => {
    onOpenChange(false);
    form.reset();
    setSubmitted(null);
    if (screenshot) URL.revokeObjectURL(screenshot.previewUrl);
    setScreenshot(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(next) : resetAndClose())}
    >
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-6 pb-5 max-xl:pt-8">
          <DialogTitle className="font-semibold">
            {t("feedback.title")}
          </DialogTitle>
          <DialogDescription className={submitted ? "sr-only" : undefined}>
            {submitted ? t("feedback.title") : t("feedback.description")}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <FeedbackReferenceChip
              reference={submitted}
              title={t("feedback.success")}
              description={t("feedback.successDescription")}
              doneLabel={t("feedback.done")}
              onDone={resetAndClose}
            />
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-5 pb-4">
              <form.Field name="type">
                {(field) => (
                  <div className="grid grid-cols-4 gap-2">
                    {TYPE_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
                      const active = field.state.value === value;
                      const label = t(labelKey);
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={label}
                          title={label}
                          onClick={() => {
                            if (field.state.value === "bug" && value !== "bug") {
                              if (screenshot) {
                                URL.revokeObjectURL(screenshot.previewUrl);
                                setScreenshot(null);
                              }
                            }
                            field.handleChange(value);
                          }}
                          className={cn(
                            "flex h-14 flex-col items-center justify-center gap-1 rounded-lg border transition-colors duration-fast",
                            active
                              ? "border-primary-border bg-primary-soft text-foreground"
                              : "border-border text-muted-foreground hover:bg-surface-raised",
                          )}
                        >
                          <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                          <span className="text-2xs font-medium">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </form.Field>

              <form.Field name="message">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="feedback-message">
                        {t("feedback.messageLabel")}
                      </Label>
                      <FeedbackCharRing
                        value={field.state.value.length}
                        max={MESSAGE_MAX}
                      />
                    </div>
                    <Textarea
                      id="feedback-message"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("feedback.messagePlaceholder")}
                      rows={4}
                      maxLength={MESSAGE_MAX}
                    />
                  </div>
                )}
              </form.Field>

              {/* Reserve thumbnail height so switching to Bug / attaching doesn't resize the drawer */}
              <div className="flex min-h-14 items-center">
                <form.Field name="type">
                  {(field) =>
                    field.state.value === "bug" ? (
                      <FeedbackScreenshotAttach
                        screenshot={screenshot}
                        onChange={setScreenshot}
                        attachLabel={t("feedback.attachScreenshot")}
                        tooLargeLabel={t("feedback.screenshotTooLarge")}
                      />
                    ) : null
                  }
                </form.Field>
              </div>
            </div>

            <div className="drawer-footer px-5">
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <form.Subscribe selector={(s) => s.values.message}>
                {(message) => (
                  <button
                    type="submit"
                    disabled={submit.isPending || !message.trim()}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                  >
                    {t("feedback.submit")}
                  </button>
                )}
              </form.Subscribe>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
