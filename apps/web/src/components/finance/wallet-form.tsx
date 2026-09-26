import { WalletPreviewCard } from "@/components/finance/wallet-preview-card";
import type { PaymentMethod, Wallet } from "@/components/finance/types";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Bitcoin,
  CreditCard,
  Landmark,
  Money,
  QrCode,
  Save,
  Wallet as WalletIcon,
} from "@/components/icons";
import {
  isValidCardExpiry,
  isValidCardNumber,
  isValidPromptPayId,
  isValidSwiftBic,
} from "@/lib/payment-destination-schema";
import { activeThBanks } from "@/lib/th-banks";
import { cn, fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const METHOD_OPTIONS: { value: PaymentMethod; icon: typeof Landmark }[] = [
  { value: "bank_transfer", icon: Landmark },
  { value: "card", icon: CreditCard },
  { value: "promptpay", icon: QrCode },
  { value: "cash", icon: Money },
  { value: "crypto", icon: Bitcoin },
  { value: "other", icon: WalletIcon },
];

const INVOICE_ELIGIBLE_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "card",
  "promptpay",
];

const walletFormSchema = z
  .object({
    type: z.enum([
      "bank_transfer",
      "card",
      "promptpay",
      "cash",
      "crypto",
      "other",
    ]),
    isDefault: z.boolean(),
    bankName: z.string().max(120),
    accountNumber: z.string().max(34),
    accountName: z.string().max(120),
    swiftCode: z.string().max(11),
    promptPayId: z.string().max(34),
    cardNumber: z.string().max(19),
    cardExpiry: z.string().max(7),
    cardholderName: z.string().max(120),
    showOnInvoice: z.boolean(),
    isDefaultInvoice: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "bank_transfer") {
      if (!v.bankName.trim())
        ctx.addIssue({
          code: "custom",
          path: ["bankName"],
          message: "required",
        });
      if (!v.accountNumber.trim())
        ctx.addIssue({
          code: "custom",
          path: ["accountNumber"],
          message: "required",
        });
      if (v.swiftCode.trim() && !isValidSwiftBic(v.swiftCode))
        ctx.addIssue({
          code: "custom",
          path: ["swiftCode"],
          message: "invalidSwift",
        });
    }
    if (v.type === "card") {
      if (!v.cardNumber.trim())
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "required",
        });
      else if (!isValidCardNumber(v.cardNumber))
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "invalidCardNumber",
        });
      if (!v.cardExpiry.trim())
        ctx.addIssue({
          code: "custom",
          path: ["cardExpiry"],
          message: "required",
        });
      else if (!isValidCardExpiry(v.cardExpiry))
        ctx.addIssue({
          code: "custom",
          path: ["cardExpiry"],
          message: "invalidExpiry",
        });
    }
    if (v.type === "promptpay") {
      if (!v.promptPayId.trim())
        ctx.addIssue({
          code: "custom",
          path: ["promptPayId"],
          message: "required",
        });
      else if (!isValidPromptPayId(v.promptPayId))
        ctx.addIssue({
          code: "custom",
          path: ["promptPayId"],
          message: "invalidPromptPay",
        });
    }
  });

export type WalletFormValues = z.infer<typeof walletFormSchema>;

const VALIDATION_CODES = [
  "required",
  "invalidSwift",
  "invalidCardNumber",
  "invalidExpiry",
  "invalidPromptPay",
] as const;

type ValidationCode = (typeof VALIDATION_CODES)[number];

function useFieldErrorText() {
  const { t } = useTranslation("accounting");
  return (errors: unknown[]): string | undefined => {
    const raw = fieldError(errors);
    if (!raw) return undefined;
    if ((VALIDATION_CODES as readonly string[]).includes(raw)) {
      return t(`walletManager.errors.${raw as ValidationCode}`);
    }
    return raw;
  };
}

function maskCardExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function maskCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

interface WalletFormProps {
  initialData?: Partial<Wallet>;
  isFirstWallet: boolean;
  onSubmit: (values: WalletFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function WalletForm({
  initialData,
  isFirstWallet,
  onSubmit,
  onCancel,
  isPending,
}: WalletFormProps) {
  const { t, i18n } = useTranslation("accounting");
  const errorText = useFieldErrorText();
  const form = useForm({
    defaultValues: {
      type: (initialData?.type ?? "bank_transfer") as PaymentMethod,
      isDefault: initialData?.isDefault ?? isFirstWallet,
      bankName: initialData?.bankName ?? "",
      accountNumber: initialData?.accountNumber ?? "",
      accountName: initialData?.accountName ?? "",
      swiftCode: initialData?.swiftCode ?? "",
      promptPayId: initialData?.promptPayId ?? "",
      cardNumber: initialData?.cardNumber ?? "",
      cardExpiry: initialData?.cardExpiry ?? "",
      cardholderName: initialData?.cardholderName ?? "",
      showOnInvoice: initialData?.showOnInvoice ?? isFirstWallet,
      isDefaultInvoice: initialData?.isDefaultInvoice ?? false,
    },
    validators: { onChange: walletFormSchema, onSubmit: walletFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 py-3 sm:grid-cols-[15rem_1fr]">
        <div className="space-y-2">
          <form.Subscribe
            selector={(s) =>
              [
                s.values.type,
                s.values.isDefault,
                s.values.bankName,
                s.values.accountNumber,
                s.values.cardNumber,
                s.values.cardholderName,
                s.values.cardExpiry,
                s.values.promptPayId,
              ] as const
            }
          >
            {([
              type,
              isDefault,
              bankName,
              accountNumber,
              cardNumber,
              cardholderName,
              cardExpiry,
              promptPayId,
            ]) => (
              <WalletPreviewCard
                values={{
                  type,
                  isDefault,
                  bankName,
                  accountNumber,
                  cardNumber,
                  cardholderName,
                  cardExpiry,
                  promptPayId,
                }}
              />
            )}
          </form.Subscribe>
        </div>

        <div className="space-y-3">
          <form.Field name="type">
            {(field) => (
              <FormField
                label={t("walletManager.paymentMethod")}
                htmlFor="wallet-method"
              >
                <div
                  className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4"
                  role="radiogroup"
                  aria-label={t("walletManager.paymentMethod")}
                >
                  {METHOD_OPTIONS.map(({ value, icon: Icon }) => {
                    const selected = field.state.value === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          field.handleChange(value);
                          if (!INVOICE_ELIGIBLE_METHODS.includes(value)) {
                            form.setFieldValue("showOnInvoice", false);
                            form.setFieldValue("isDefaultInvoice", false);
                          }
                        }}
                        className={cn(
                          "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 transition-colors duration-fast",
                          selected
                            ? "border-primary-border bg-primary-soft text-primary"
                            : "border-border-subtle text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                        )}
                      >
                        <Icon size={15} strokeWidth={2} />
                        <span className="text-2xs font-medium leading-none">
                          {t(`walletManager.methods.${value}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormField>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => s.values.type}>
            {(type) =>
              type === "bank_transfer" && (
                <div className="space-y-3 rounded-xl border border-border-subtle p-3">
                  <form.Field name="bankName">
                    {(field) => (
                      <FormField
                        label={t("walletManager.bank")}
                        htmlFor="wallet-bank-name"
                        error={
                          field.state.meta.isTouched
                            ? errorText(field.state.meta.errors)
                            : undefined
                        }
                      >
                        <Select
                          value={field.state.value}
                          onValueChange={field.handleChange}
                        >
                          <SelectTrigger id="wallet-bank-name">
                            <SelectValue
                              placeholder={t("walletManager.selectBank")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {activeThBanks.map((bank) => (
                              <SelectItem key={bank.code} value={bank.nameEn}>
                                {i18n.language.startsWith("th")
                                  ? bank.nameTh
                                  : bank.nameEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    )}
                  </form.Field>

                  <div className="grid grid-cols-2 gap-3">
                    <form.Field name="accountNumber">
                      {(field) => (
                        <FormField
                          label={t("walletManager.accountNumber")}
                          htmlFor="wallet-account-number"
                          error={
                            field.state.meta.isTouched
                              ? errorText(field.state.meta.errors)
                              : undefined
                          }
                        >
                          <Input
                            id="wallet-account-number"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </FormField>
                      )}
                    </form.Field>

                    <form.Field name="accountName">
                      {(field) => (
                        <FormField
                          label={t("walletManager.accountName")}
                          htmlFor="wallet-account-name"
                        >
                          <Input
                            id="wallet-account-name"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </FormField>
                      )}
                    </form.Field>

                    <form.Field name="swiftCode">
                      {(field) => (
                        <FormField
                          label={t("walletManager.swiftCode")}
                          htmlFor="wallet-swift-code"
                          error={
                            field.state.meta.isTouched
                              ? errorText(field.state.meta.errors)
                              : undefined
                          }
                        >
                          <Input
                            id="wallet-swift-code"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.target.value.toUpperCase())
                            }
                            onBlur={field.handleBlur}
                          />
                        </FormField>
                      )}
                    </form.Field>
                  </div>
                </div>
              )
            }
          </form.Subscribe>

          <form.Subscribe selector={(s) => s.values.type}>
            {(type) =>
              type === "card" && (
                <div className="space-y-3 rounded-xl border border-border-subtle p-3">
                  <form.Field name="cardNumber">
                    {(field) => (
                      <FormField
                        label={t("walletManager.cardNumber")}
                        htmlFor="wallet-card-number"
                        error={
                          field.state.meta.isTouched
                            ? errorText(field.state.meta.errors)
                            : undefined
                        }
                      >
                        <Input
                          id="wallet-card-number"
                          placeholder="•••• •••• •••• 4242"
                          inputMode="numeric"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(maskCardNumber(e.target.value))
                          }
                          onBlur={field.handleBlur}
                        />
                      </FormField>
                    )}
                  </form.Field>

                  <div className="grid grid-cols-2 gap-3">
                    <form.Field name="cardholderName">
                      {(field) => (
                        <FormField
                          label={t("walletManager.cardholderName")}
                          htmlFor="wallet-cardholder-name"
                        >
                          <Input
                            id="wallet-cardholder-name"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </FormField>
                      )}
                    </form.Field>

                    <form.Field name="cardExpiry">
                      {(field) => (
                        <FormField
                          label={t("walletManager.expiry")}
                          htmlFor="wallet-card-expiry"
                          error={
                            field.state.meta.isTouched
                              ? errorText(field.state.meta.errors)
                              : undefined
                          }
                        >
                          <Input
                            id="wallet-card-expiry"
                            placeholder="MM/YY"
                            inputMode="numeric"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(maskCardExpiry(e.target.value))
                            }
                            onBlur={field.handleBlur}
                          />
                        </FormField>
                      )}
                    </form.Field>
                  </div>
                </div>
              )
            }
          </form.Subscribe>

          <form.Subscribe selector={(s) => s.values.type}>
            {(type) =>
              type === "promptpay" && (
                <form.Field name="promptPayId">
                  {(field) => (
                    <FormField
                      label={t("walletManager.promptPayId")}
                      htmlFor="wallet-promptpay-id"
                      description={t("walletManager.promptPayIdHint")}
                      error={
                        field.state.meta.isTouched
                          ? errorText(field.state.meta.errors)
                          : undefined
                      }
                    >
                      <Input
                        id="wallet-promptpay-id"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </FormField>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>

          <form.Field name="isDefault">
            {(field) => (
              <div className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("walletManager.defaultWallet")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("walletManager.defaultWalletHint")}
                  </p>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  size="sm"
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => s.values.type}>
            {(type) =>
              INVOICE_ELIGIBLE_METHODS.includes(type) && (
                <form.Field name="showOnInvoice">
                  {(field) => (
                    <div className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {t("walletManager.enableForInvoices")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("walletManager.enableForInvoicesHint")}
                        </p>
                      </div>
                      <Switch
                        checked={field.state.value}
                        onCheckedChange={(checked) => {
                          field.handleChange(checked);
                          if (!checked)
                            form.setFieldValue("isDefaultInvoice", false);
                        }}
                        size="sm"
                      />
                    </div>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>

          <form.Subscribe
            selector={(s) =>
              [
                s.values.showOnInvoice,
                INVOICE_ELIGIBLE_METHODS.includes(s.values.type),
              ] as const
            }
          >
            {([showOnInvoice, eligible]) =>
              showOnInvoice &&
              eligible && (
                <form.Field name="isDefaultInvoice">
                  {(field) => (
                    <div className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {t("walletManager.defaultForInvoices")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("walletManager.defaultForInvoicesHint")}
                        </p>
                      </div>
                      <Switch
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                        size="sm"
                      />
                    </div>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>
        </div>
      </div>

      <div className="drawer-footer">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
        >
          {t("walletManager.cancel")}
        </button>
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            >
              <Save size={11} strokeWidth={2.5} />
              {t("walletManager.save")}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
