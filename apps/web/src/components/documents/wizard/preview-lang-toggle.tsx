interface PreviewLangToggleProps {
  value: "th" | "en";
  onChange: (lang: "th" | "en") => void;
}

export function PreviewLangToggle({ value, onChange }: PreviewLangToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border-strong text-xs">
      <button
        type="button"
        onClick={() => onChange("th")}
        className={`px-3 py-1.5 font-medium transition-colors duration-fast ${
          value === "th"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-surface-raised"
        }`}
      >
        TH
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`border-l border-border-strong px-3 py-1.5 font-medium transition-colors duration-fast ${
          value === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-surface-raised"
        }`}
      >
        EN
      </button>
    </div>
  );
}
