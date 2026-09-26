import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  required?: boolean;
  /** Render the label inline, to the left of the input, instead of stacked above it. */
  inline?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  inline,
  children,
}: FormFieldProps) {
  if (inline) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <Label htmlFor={htmlFor} className="mb-0 shrink-0 pt-2">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
