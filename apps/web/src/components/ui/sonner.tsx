import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "@/components/icons";
import { useTheme } from "@/context/theme";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ style, ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: <CheckCircle2 size={16} />,
        error: <XCircle size={16} />,
        warning: <AlertCircle size={16} />,
        info: <Info size={16} />,
        loading: <Loader2 size={16} className="animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface-raised)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-default)",
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
