import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

export interface AddressValues {
  address: string;
  addressTh: string;
  zip: string;
  country: string;
}

interface AddressLabelFieldProps {
  values: AddressValues;
  onChange: (patch: Partial<AddressValues>) => void;
}

export function AddressLabelField({ values, onChange }: AddressLabelFieldProps) {
  const { t } = useTranslation("contacts");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Input
          aria-label={t("persona.addressEn")}
          value={values.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder={t("persona.addressEnPlaceholder")}
          className="h-9"
        />
        <Input
          aria-label={t("persona.addressTh")}
          value={values.addressTh}
          onChange={(e) => onChange({ addressTh: e.target.value })}
          placeholder="456 ถนนสีลม แขวงสีลม เขตบางรัก"
          className="h-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          aria-label={t("persona.zip")}
          value={values.zip}
          onChange={(e) => onChange({ zip: e.target.value })}
          placeholder="10500"
          className="h-9"
        />
        <Input
          aria-label={t("persona.country")}
          value={values.country}
          onChange={(e) => onChange({ country: e.target.value })}
          placeholder={t("persona.countryPlaceholder")}
          className="h-9"
        />
      </div>
    </div>
  );
}
