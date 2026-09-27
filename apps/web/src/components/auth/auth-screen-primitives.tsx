import type { ReactNode } from "react";

export function AuthRadialBackdrop({
  variant,
}: {
  variant: "login" | "register";
}) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {variant === "login" ? (
        <>
          <div
            className="auth-radial auth-radial-login-top absolute top-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 opacity-[0.06]"
          />
          <div
            className="auth-radial auth-radial-login-bottom absolute bottom-0 right-1/4 h-[300px] w-[400px] opacity-[0.04]"
          />
        </>
      ) : (
        <>
          <div
            className="auth-radial auth-radial-register-top absolute top-0 right-1/3 h-[350px] w-[500px] opacity-[0.05]"
          />
          <div
            className="auth-radial auth-radial-register-bottom absolute bottom-0 left-1/4 h-[300px] w-[400px] opacity-[0.05]"
          />
        </>
      )}
    </div>
  );
}

export function AuthOAuthSocialButton({
  icon,
  label,
  onClick,
  accent,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="enabled:hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-base active:scale-[0.98] [&>svg]:shrink-0"
      style={{
        background: accent ?? "var(--surface-raised)",
        border: "1px solid var(--border-default)",
        color: accent ? "#fff" : "var(--text-primary)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function AuthOAuthGhostButton({
  icon,
  label,
  discord,
  accent,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  discord?: boolean;
  accent?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const accentColor = accent ?? (discord ? "#5865F2" : undefined);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="enabled:hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-base active:scale-[0.98] bg-card border border-border text-foreground [&>svg]:shrink-0"
      style={
        accentColor
          ? {
              background: accentColor,
              color: "#fff",
              border: `1px solid ${accentColor}`,
            }
          : undefined
      }
    >
      {icon}
      {label}
    </button>
  );
}

export function AuthOrDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
