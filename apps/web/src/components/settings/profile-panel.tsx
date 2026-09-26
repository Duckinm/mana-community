import { CurrencySelect } from "@/components/settings/currency-select";
import { ProfileAvatar } from "@/components/settings/profile-avatar";
import { SavedIndicator } from "@/components/settings/saved-indicator";
import { Row } from "@/components/settings/shared";
import { TimezoneSelect } from "@/components/settings/timezone-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/context/settings";
import { useCurrency } from "@/hooks/use-currency";
import {
  inferBrowserRegion,
  resolveCalendar,
  resolveDateFormat,
  resolveTimeFormat,
} from "@/lib/date-time-preferences";
import type { UserPatch, UserPrefs } from "@/lib/user-types";
import { fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

type SavedField =
  | "name"
  | "timezone"
  | "currency"
  | "region"
  | "dateFormat"
  | "timeFormat";

const profileSchema = z.object({
  name: z.string().trim().min(1),
  timezone: z.string(),
  currency: z.string(),
  region: z.enum(["TH", "US"]),
  dateFormat: z.enum(["regional", "dmy", "mdy"]),
  timeFormat: z.enum(["regional", "h12", "h24"]),
});

interface ProfilePanelProps {
  user: UserPrefs | null;
}

export function ProfilePanel({ user }: ProfilePanelProps) {
  const { t } = useTranslation("settings");
  const { currency, setCurrency } = useCurrency();
  const { patchUser, saveFnRef } = useSettings();
  const [saved, setSaved] = useState<Set<SavedField>>(new Set());
  const savedTimers = useRef<Map<SavedField, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      timezone: user?.timezone ?? "",
      currency: user?.currency ?? currency.code,
      region: user?.region ?? inferBrowserRegion(),
      dateFormat: user?.dateFormat ?? "regional",
      timeFormat: user?.timeFormat ?? "regional",
    },
    validators: { onChange: profileSchema },
  });

  function pulseSaved(field: SavedField) {
    setSaved((prev) => new Set(prev).add(field));
    clearTimeout(savedTimers.current.get(field));
    savedTimers.current.set(
      field,
      setTimeout(() => {
        setSaved((prev) => {
          const next = new Set(prev);
          next.delete(field);
          return next;
        });
      }, 2000),
    );
  }

  useEffect(() => {
    const timers = savedTimers.current;
    return () => {
      for (const id of timers.values()) clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    saveFnRef.current = async () => {
      const values = form.state.values;
      const parsed = profileSchema.safeParse(values);
      if (!parsed.success) {
        // Guard: a blank name propagates to document "From" and AI chats —
        // skip the whole save until the user fixes it.
        form.validateAllFields("change");
        return;
      }

      const patch: UserPatch = {};
      const changed: SavedField[] = [];
      if (parsed.data.name !== user?.name) {
        patch.name = parsed.data.name;
        changed.push("name");
      }
      if (parsed.data.timezone !== (user?.timezone ?? "")) {
        patch.timezone = parsed.data.timezone;
        changed.push("timezone");
      }
      if (parsed.data.currency !== (user?.currency ?? currency.code)) {
        patch.currency = parsed.data.currency;
        changed.push("currency");
      }
      if (parsed.data.region !== user?.region) {
        patch.region = parsed.data.region;
        changed.push("region");
      }
      if (parsed.data.dateFormat !== user?.dateFormat) {
        patch.dateFormat = parsed.data.dateFormat;
        changed.push("dateFormat");
      }
      if (parsed.data.timeFormat !== user?.timeFormat) {
        patch.timeFormat = parsed.data.timeFormat;
        changed.push("timeFormat");
      }
      if (changed.length === 0) return;

      await patchUser(patch);
      for (const field of changed) pulseSaved(field);
    };
    return () => {
      saveFnRef.current = null;
    };
  }, [form, user, patchUser, saveFnRef, currency.code]);

  return (
    <div>
      <ProfileAvatar user={user} />

      <form.Field
        name="name"
        validators={{ onChange: profileSchema.shape.name }}
      >
        {(field) => {
          const error = field.state.meta.isTouched
            ? fieldError(field.state.meta.errors)
            : undefined;
          return (
            <Row label={t("profile.fullName")}>
              <div className="flex flex-col items-end gap-1">
                <div className="flex w-full items-center justify-end gap-2">
                  <SavedIndicator show={saved.has("name")} />
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className={`h-8 w-full max-w-xs px-3 text-sm md:text-right ${error ? "border-danger/60" : ""}`}
                    placeholder={t("profile.fullNamePlaceholder")}
                  />
                </div>
                {error && (
                  <p className="text-xs text-danger">
                    {t("profile.nameRequired")}
                  </p>
                )}
              </div>
            </Row>
          );
        }}
      </form.Field>

      <Row label={t("profile.email")}>
        <div className="flex items-center justify-end gap-2">
          <Input
            value={user?.email ?? ""}
            readOnly
            className="h-8 w-full max-w-xs px-3 text-sm md:text-right opacity-70"
          />
        </div>
      </Row>

      <form.Field name="timezone">
        {(field) => (
          <Row label={t("profile.timezone")}>
            <div className="flex items-center justify-end gap-2">
              <SavedIndicator show={saved.has("timezone")} />
              <TimezoneSelect
                value={field.state.value}
                onChange={field.handleChange}
              />
            </div>
          </Row>
        )}
      </form.Field>

      <form.Field name="currency">
        {(field) => (
          <Row label={t("profile.currency")} sub={t("profile.currencySub")}>
            <div className="flex items-center justify-between gap-2 md:justify-end">
              <SavedIndicator show={saved.has("currency")} />
              <CurrencySelect
                value={field.state.value}
                onChange={(code) => {
                  field.handleChange(code);
                  setCurrency(code);
                }}
              />
            </div>
          </Row>
        )}
      </form.Field>

      <div className="mt-7 pb-1">
        <h3 className="text-base font-medium text-muted-foreground">
          {t("profile.languageRegion")}
        </h3>
      </div>

      <form.Field name="region">
        {(field) => (
          <Row label={t("profile.region")} sub={t("profile.regionSub")}>
            <div className="flex items-center justify-end gap-2">
              <SavedIndicator show={saved.has("region")} />
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(profileSchema.shape.region.parse(value))
                }
              >
                <SelectTrigger size="sm" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="TH">{t("profile.thailand")}</SelectItem>
                  <SelectItem value="US">
                    {t("profile.unitedStates")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Row>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.region}>
        {(region) => (
          <form.Field name="dateFormat">
            {(field) => (
              <Row label={t("profile.dateFormat")}>
                <div className="flex items-center justify-end gap-2">
                  <SavedIndicator show={saved.has("dateFormat")} />
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        profileSchema.shape.dateFormat.parse(value),
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="regional">
                        {t("profile.regionalDefault", {
                          example:
                            `${
                              resolveDateFormat(region) === "dmy"
                                ? "DD/MM/YYYY"
                                : "MM/DD/YYYY"
                            } · ${
                              resolveCalendar(region) === "buddhist"
                                ? t("profile.buddhistEra")
                                : t("profile.gregorianEra")
                            }`,
                        })}
                      </SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Row>
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.values.region}>
        {(region) => (
          <form.Field name="timeFormat">
            {(field) => (
              <Row label={t("profile.timeFormat")}>
                <div className="flex items-center justify-end gap-2">
                  <SavedIndicator show={saved.has("timeFormat")} />
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        profileSchema.shape.timeFormat.parse(value),
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="regional">
                        {t("profile.regionalDefault", {
                          example:
                            resolveTimeFormat(region) === "h24"
                              ? t("profile.twentyFourHour")
                              : t("profile.twelveHour"),
                        })}
                      </SelectItem>
                      <SelectItem value="h12">
                        {t("profile.twelveHour")}
                      </SelectItem>
                      <SelectItem value="h24">
                        {t("profile.twentyFourHour")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Row>
            )}
          </form.Field>
        )}
      </form.Subscribe>
    </div>
  );
}
