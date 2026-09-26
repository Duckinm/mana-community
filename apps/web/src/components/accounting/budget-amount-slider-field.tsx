import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { Currency } from "@/hooks/use-currency";
import { useTranslation } from "react-i18next";

interface BudgetAmountSliderFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  currency: Currency;
  avgCents: number;
  sparkline: number[];
  error?: string;
}

function buildSparklinePoints(sparkline: number[]): string {
  if (sparkline.length === 0) return "";
  const max = Math.max(...sparkline, 1);
  const stepX = sparkline.length > 1 ? 100 / (sparkline.length - 1) : 100;
  return sparkline
    .map((value, i) => `${i * stepX},${100 - (value / max) * 100}`)
    .join(" ");
}

export function BudgetAmountSliderField({
  value,
  onChange,
  onBlur,
  currency,
  avgCents,
  sparkline,
  error,
}: BudgetAmountSliderFieldProps) {
  const { t } = useTranslation("accounting");
  const amountCents = Math.round((parseFloat(value) || 0) * 100);
  const points = buildSparklinePoints(sparkline);
  const sliderMax = Math.max(avgCents * 2.5, 50000);
  const sliderStep = Math.max(100, Math.round(sliderMax / 100 / 10) * 10);

  return (
    <div>
      <Label htmlFor="budget-amount">{t("budgets.amount")}</Label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none text-muted-foreground">
          {currency.symbol}
        </span>
        <Input
          id="budget-amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="pl-8 tabular-nums"
        />
      </div>

      {points && (
        <div className="relative h-9 mt-3 mb-1">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0 h-6 w-full text-primary opacity-25"
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <Slider
            className="absolute inset-x-0 bottom-0"
            min={0}
            max={sliderMax}
            step={sliderStep}
            value={[Math.min(amountCents, sliderMax)]}
            onValueChange={([next]) => onChange((next / 100).toFixed(2))}
          />
        </div>
      )}

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
