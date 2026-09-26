import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function Toggle({
 on,
 onChange,
 disabled,
 ariaLabel,
}: {
 on: boolean;
 onChange: (v: boolean) => void;
 disabled?: boolean;
 ariaLabel?: string;
}) {
 return (
 <Switch
 checked={on}
 onCheckedChange={onChange}
 disabled={disabled}
 size="sm"
 aria-label={ariaLabel}
 />
 );
}

export function Row({
 label,
 sub,
 children,
}: {
 label: string;
 sub?: React.ReactNode;
 children?: React.ReactNode;
}) {
 return (
 <div className="grid grid-cols-1 @min-[30rem]/settings-panel:grid-cols-[minmax(9rem,11rem)_minmax(0,26rem)] gap-x-5 gap-y-1 py-2.5 @min-[30rem]/settings-panel:items-center [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-subtle">
 <div className="min-w-0">
 <p className="text-sm font-medium text-foreground">
 {label}
 </p>
 {sub && (
 <p className="text-xs mt-0.5 text-caption">
 {sub}
 </p>
 )}
 </div>
 <div className="w-full max-w-md @min-[30rem]/settings-panel:max-w-none">
 {children}
 </div>
 </div>
 );
}

export function TextInput({
 value,
 placeholder,
}: {
 value: string;
 placeholder?: string;
}) {
 return (
 <Input
 defaultValue={value}
 placeholder={placeholder}
 className="h-8 w-full max-w-xs px-3 text-sm md:text-right"
 />
 );
}
