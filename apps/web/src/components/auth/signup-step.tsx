import { useCapabilities } from "@/hooks/use-capabilities";
import { CapabilityNotice } from "@/components/capability-notice";
import {
  AuthDiscordIcon,
  AuthFacebookIcon,
  AuthGoogleIcon,
} from "@/components/auth/auth-provider-icons";
import { registerSchema } from "@/components/auth/auth-schemas";
import {
  AuthOAuthGhostButton,
  AuthOrDivider,
} from "@/components/auth/auth-screen-primitives";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { saveOnboardingProfile } from "@/components/onboarding/draft";
import type { OnboardingData } from "@/components/onboarding/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionContext } from "@/context/session";
import { signIn, signUp } from "@/lib/auth-client";
import { landingUrl } from "@/lib/landing-url";
import { fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SignupStep({
  data,
  onBack,
  onSuccess,
  onNeedsVerification,
}: {
  data?: Partial<OnboardingData>;
  onBack?: () => void;
  onSuccess: () => void;
  onNeedsVerification: (email: string) => void;
}) {
  const { refetch } = useSessionContext();
  const { t } = useTranslation("auth");
  const { t: tOnboarding } = useTranslation("onboarding");
  const capabilities = useCapabilities();
  const socialProviders = capabilities.data?.socialProviders;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSocialSignUp(
    provider: "google" | "discord" | "facebook",
  ) {
    setErrorMsg(null);
    localStorage.setItem('fast-lane-registration', '1');
    sessionStorage.setItem('fast-lane-open-contact', '1');
    const { error } = await signIn.social({
      provider,
      callbackURL: `${window.location.origin}/home`,
      newUserCallbackURL: `${window.location.origin}/home`,
      errorCallbackURL: `${window.location.origin}/register`,
    });
    if (error) {
      localStorage.removeItem('fast-lane-registration');
      sessionStorage.removeItem('fast-lane-open-contact');
      setErrorMsg(error.message ?? t("register.failed"));
    }
  }

  const form = useForm({
    defaultValues: { email: "", password: "", confirmPassword: "" },
    validators: { onChange: registerSchema },
    onSubmit: async ({ value }) => {
      setErrorMsg(null);
      const name = value.email.split("@")[0];
      const { data: signUpData, error } = await signUp.email({
        name,
        email: value.email,
        password: value.password,
        callbackURL: `${window.location.origin}/home`,
      });
      if (error) {
        setErrorMsg(error.message ?? t("register.failed"));
        return;
      }
      // token is null when email verification is required — no session yet,
      // so skip the profile patch (needs auth) and leave the draft in place
      // for `_app`'s post-verification flush to pick up.
      if (!signUpData.token) {
        onNeedsVerification(value.email);
        return;
      }
      try {
        await saveOnboardingProfile(data ?? {}, name);
      } catch {
        // Best-effort — don't block the user if the patch fails
      }
      await refetch();
      onSuccess();
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <AuthOAuthGhostButton
          icon={<AuthGoogleIcon />}
          label={t("register.google")}
          disabled={capabilities.isError || !socialProviders?.google}
          onClick={() => void handleSocialSignUp("google")}
        />
        <AuthOAuthGhostButton
          icon={<AuthDiscordIcon />}
          label={t("register.discord")}
          disabled={capabilities.isError || !socialProviders?.discord}
          discord
          onClick={() => void handleSocialSignUp("discord")}
        />
        <AuthOAuthGhostButton
          icon={<AuthFacebookIcon />}
          label={t("register.facebook")}
          disabled={capabilities.isError || !socialProviders?.facebook}
          accent="#1877F2"
          onClick={() => void handleSocialSignUp("facebook")}
        />
      </div>

      <CapabilityNotice available={!!socialProviders && Object.values(socialProviders).every(Boolean)} unavailableKey="socialUnavailable" />
      <AuthOrDivider />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-2"
      >
        <form.Field name="email">
          {(field) => (
            <TextFieldRow
              field={field}
              type="email"
              placeholder={t("register.email")}
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <TextFieldRow
              field={field}
              type="password"
              placeholder={t("register.password")}
            />
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => (
            <TextFieldRow
              field={field}
              type="password"
              placeholder={t("register.confirmPassword")}
            />
          )}
        </form.Field>

        <form.Subscribe
          selector={(s) =>
            [s.values.password, s.values.confirmPassword] as const
          }
        >
          {([password, confirmPassword]) => (
            <PasswordChecklist
              password={password}
              confirmPassword={confirmPassword}
            />
          )}
        </form.Subscribe>

        {errorMsg && (
          <p className="text-xs text-danger text-center">{errorMsg}</p>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("register.termsPrefix")}{" "}
          <a
            href={landingUrl("/terms")}
            target="_blank"
            rel="noreferrer"
            className="underline text-muted-foreground hover:text-foreground"
          >
            {t("register.terms")}
          </a>{" "}
          {t("register.and")}{" "}
          <a
            href={landingUrl("/privacy-policy")}
            target="_blank"
            rel="noreferrer"
            className="underline text-muted-foreground hover:text-foreground"
          >
            {t("register.privacy")}
          </a>
          .
        </p>

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <div className="flex gap-3">
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onBack}
                >
                  {tOnboarding("actions.back")}
                </Button>
              )}
              <Button
                type="submit"
                variant="solid"
                size="lg"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("register.submitting") : t("register.submit")}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}

function TextFieldRow({
  field,
  type,
  placeholder,
}: {
  field: {
    state: { value: string; meta: { isTouched: boolean; errors: unknown[] } };
    handleChange: (v: string) => void;
    handleBlur: () => void;
  };
  type: "text" | "email" | "password";
  placeholder: string;
}) {
  const err = field.state.meta.isTouched
    ? fieldError(field.state.meta.errors)
    : undefined;
  return (
    <div className="space-y-1">
      <Input
        type={type}
        placeholder={placeholder}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        className={err ? "border-danger/60" : ""}
      />
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
