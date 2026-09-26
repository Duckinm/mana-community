import {
  AuthDiscordIcon,
  AuthFacebookIcon,
  AuthGoogleIcon,
} from "@/components/auth/auth-provider-icons";
import {
  AuthOAuthSocialButton,
  AuthOrDivider,
  AuthRadialBackdrop,
} from "@/components/auth/auth-screen-primitives";
import { LoginForm } from "@/components/auth/login-form";
import { ManaLogo } from "@/components/brand/mana-logo";
import { signIn } from "@/lib/auth-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.error === "string" ? { error: search.error } : {},
  component: LoginPage,
});

function LoginPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { t } = useTranslation("auth");
  const { error } = Route.useSearch();
  const callbackError = error
    ? t(error === "account_not_linked" ? "login.accountNotLinked" : "login.failed")
    : null;

  async function handleSocialSignIn(
    provider: "google" | "discord" | "facebook",
  ) {
    setErrorMsg(null);
    const { error } = await signIn.social({
      provider,
      callbackURL: `${window.location.origin}/chat`,
      errorCallbackURL: `${window.location.origin}/login`,
    });
    if (error) setErrorMsg(error.message ?? t("login.failed"));
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <AuthRadialBackdrop variant="login" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="flex justify-center">
            <ManaLogo className="h-16 w-auto sm:h-20" />
          </h1>
        </div>

        <div className="surface-card rounded-3xl p-6 space-y-4">
          <div className="grid gap-2">
            <AuthOAuthSocialButton
              icon={<AuthGoogleIcon />}
              label={t("login.google")}
              onClick={() => void handleSocialSignIn("google")}
            />
            <AuthOAuthSocialButton
              icon={<AuthDiscordIcon />}
              label={t("login.discord")}
              accent="#5865F2"
              onClick={() => void handleSocialSignIn("discord")}
            />
            <AuthOAuthSocialButton
              icon={<AuthFacebookIcon />}
              label={t("login.facebook")}
              accent="#1877F2"
              onClick={() => void handleSocialSignIn("facebook")}
            />
          </div>

          <AuthOrDivider />

          {(errorMsg ?? callbackError) && (
            <p role="alert" className="text-xs text-danger text-center">
              {errorMsg ?? callbackError}
            </p>
          )}

          <LoginForm />
        </div>

        <p className="text-center text-xs mt-5 text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link
            to="/register"
            className="font-medium hover:opacity-70 transition-opacity text-primary"
          >
            {t("login.createOne")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
