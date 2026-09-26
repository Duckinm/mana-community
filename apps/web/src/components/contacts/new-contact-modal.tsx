import { MET_VIA_OPTIONS } from "@/components/contacts/met-via";
import { AddressLabelField } from "@/components/contacts/address-label-field";
import { ContactStepDots } from "@/components/contacts/contact-step-dots";
import {
  colorFromName,
  contactSchema,
  generateInitials,
  normalizeWebsite,
  type ContactFormValues,
} from "@/components/contacts/contact-schema";
import { EntityTypeToggle } from "@/components/contacts/entity-type-toggle";
import { TagsInput } from "@/components/contacts/tags-input";
import { ThaiIdInput } from "@/components/contacts/thai-id-input";
import type { Contact } from "@/components/contacts/types";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Loader2,
  X,
} from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContacts } from "@/context/contacts";
import { client } from "@/lib/eden";
import { textToTiptapDoc } from "@/lib/rich-text";
import { fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface PendingImage {
  previewUrl: string;
  data: string;
  mediaType: string;
}


const emptyValues: ContactFormValues = {
  name: "",
  role: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  metVia: "",
  tags: "",
  color: "",
  entityType: "individual",
  companyNameEn: "",
  companyNameTh: "",
  taxId: "",
  nationalId: "",
  address: "",
  addressTh: "",
  zip: "",
  country: "",
  useSameAddress: true,
  companyAddress: "",
  companyAddressTh: "",
  companyZip: "",
  companyCountry: "",
};

interface NewContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, called with the created contact instead of navigating to its detail page. */
  onCreated?: (contact: Contact) => void;
}

export function NewContactModal({
  open,
  onOpenChange,
  onCreated,
}: NewContactModalProps) {
  const { t } = useTranslation("contacts");
  const { addContact } = useContacts();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [notes, setNotes] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [notes]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
      setPendingImage({ previewUrl: dataUrl, data, mediaType: file.type });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onChange: contactSchema },
    onSubmit: async ({ value }) => {
      const name = value.name.trim();
      const newContact = await addContact({
        name,
        initials: generateInitials(name),
        role: value.role.trim(),
        company: value.company.trim(),
        email: value.email.trim(),
        phone: value.phone.trim() || undefined,
        website: normalizeWebsite(value.website),
        color: colorFromName(name),
        metVia: value.metVia || "",
        entityType: value.entityType,
        tags: value.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: textToTiptapDoc(notes),
        relationshipLevel: 1,
        companyNameEn: value.companyNameEn.trim() || undefined,
        companyNameTh: value.companyNameTh.trim() || undefined,
        taxId: value.taxId.trim() || undefined,
        nationalId: value.nationalId.trim() || undefined,
        address: value.address.trim() || undefined,
        addressTh: value.addressTh.trim() || undefined,
        zip: value.zip.trim() || undefined,
        country: value.country.trim() || undefined,
        companyAddress: value.useSameAddress
          ? undefined
          : value.companyAddress.trim() || undefined,
        companyAddressTh: value.useSameAddress
          ? undefined
          : value.companyAddressTh.trim() || undefined,
        companyZip: value.useSameAddress
          ? undefined
          : value.companyZip.trim() || undefined,
        companyCountry: value.useSameAddress
          ? undefined
          : value.companyCountry.trim() || undefined,
      });
      if (pendingImage) {
        await client.api.contacts({ id: newContact.id }).image.post({
          data: pendingImage.data,
          mediaType: pendingImage.mediaType,
        });
      }
      close();
      if (onCreated) {
        onCreated(newContact);
      } else {
        navigate({
          to: "/contacts/$contactId",
          params: { contactId: newContact.id },
          search: { q: "", sort: "projects", edit: false },
        });
      }
    },
  });

  function reset() {
    form.reset(emptyValues);
    setNotes("");
    setStep(1);
    setPendingImage(null);
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  const saving = form.state.isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (saving) return;
        if (!isOpen) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="flex h-[min(85vh,600px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {t("newContact.title")}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 1) {
              setStep(2);
              return;
            }
            if (form.state.values.name.trim().length === 0) {
              form.setFieldMeta("name", (meta) => ({
                ...meta,
                isTouched: true,
              }));
              setStep(1);
              return;
            }
            void form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <ContactStepDots
              current={step - 1}
              total={2}
              label={
                step === 1
                  ? t("newContact.stepBasic")
                  : t("newContact.stepDetails")
              }
            />
            {step === 1 && (
              <div className="flex flex-col gap-3">
                <div className="mb-1 flex items-center gap-4">
                  <div className="relative shrink-0">
                    <form.Subscribe selector={(s) => s.values.name}>
                      {(name) => {
                        const trimmed = name.trim();
                        if (pendingImage) {
                          return (
                            <img
                              src={pendingImage.previewUrl}
                              alt={name}
                              className="h-16 w-16 rounded-full border border-border object-cover"
                            />
                          );
                        }
                        if (!trimmed) {
                          return (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
                              <Camera
                                size={20}
                                className="text-muted-foreground"
                                strokeWidth={1.75}
                              />
                            </div>
                          );
                        }
                        const color = colorFromName(trimmed);
                        return (
                          <div
                            className="flex h-16 w-16 items-center justify-center rounded-full border border-border font-sans text-xl font-medium"
                            style={{
                              background: `linear-gradient(135deg, ${color}35, ${color}12)`,
                              color,
                            }}
                          >
                            {generateInitials(trimmed)}
                          </div>
                        );
                      }}
                    </form.Subscribe>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                    >
                      <Camera size={18} className="text-white" />
                    </button>

                    {pendingImage && (
                      <button
                        type="button"
                        onClick={() => setPendingImage(null)}
                        title={t("persona.removePhoto")}
                        aria-label={t("persona.removePhoto")}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border-subtle bg-surface text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                      >
                        <X size={11} />
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <form.Field name="name">
                      {(field) => {
                        const hasError =
                          field.state.meta.isTouched &&
                          Boolean(fieldError(field.state.meta.errors));
                        return (
                          <>
                            <Input
                              id={field.name}
                              value={field.state.value}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              onBlur={field.handleBlur}
                              placeholder={t("newContact.namePlaceholder")}
                              autoFocus
                              className={`h-9 text-lg font-semibold ${
                                hasError
                                  ? "border-destructive text-destructive"
                                  : ""
                              }`}
                            />
                            {hasError && (
                              <p className="mt-1 text-xs text-destructive">
                                {fieldError(field.state.meta.errors)}
                              </p>
                            )}
                          </>
                        );
                      }}
                    </form.Field>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <form.Field name="email">
                    {(field) => (
                      <FormField
                        label={t("newContact.email")}
                        htmlFor={field.name}
                        error={
                          field.state.meta.isTouched
                            ? fieldError(field.state.meta.errors)
                            : undefined
                        }
                      >
                        <Input
                          id={field.name}
                          type="email"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder={t("newContact.emailPlaceholder")}
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name="phone">
                    {(field) => (
                      <FormField
                        label={t("newContact.phone")}
                        htmlFor={field.name}
                        error={
                          field.state.meta.isTouched
                            ? fieldError(field.state.meta.errors)
                            : undefined
                        }
                      >
                        <Input
                          id={field.name}
                          type="tel"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder={t("newContact.phonePlaceholder")}
                        />
                      </FormField>
                    )}
                  </form.Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <form.Field name="website">
                    {(field) => (
                      <FormField
                        label={t("newContact.website")}
                        htmlFor={field.name}
                      >
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={() =>
                            field.handleChange(
                              normalizeWebsite(field.state.value),
                            )
                          }
                          placeholder={t("newContact.websitePlaceholder")}
                        />
                      </FormField>
                    )}
                  </form.Field>
                  <form.Field name="metVia">
                    {(field) => (
                      <FormField
                        label={t("newContact.metVia")}
                        htmlFor={field.name}
                      >
                        <Select
                          value={field.state.value}
                          onValueChange={field.handleChange}
                        >
                          <SelectTrigger id={field.name} className="h-9">
                            <SelectValue
                              placeholder={t("newContact.selectPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {MET_VIA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(`metVia.${opt.key}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    )}
                  </form.Field>
                </div>

                <form.Field name="tags">
                  {(field) => (
                    <FormField
                      label={t("newContact.tags")}
                      htmlFor={field.name}
                    >
                      <TagsInput
                        value={field.state.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)}
                        onChange={(tags) => field.handleChange(tags.join(", "))}
                        placeholder={t("newContact.tagsPlaceholder")}
                      />
                    </FormField>
                  )}
                </form.Field>

                <textarea
                  ref={notesRef}
                  id="new-contact-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("newContact.notesPlaceholder")}
                  rows={3}
                  className="max-h-48 w-full resize-none overflow-y-auto rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-caption focus:border-border-strong"
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                <form.Field name="entityType">
                  {(field) => (
                    <EntityTypeToggle
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  )}
                </form.Field>

                <form.Subscribe selector={(s) => s.values.entityType}>
                  {(entityType) =>
                    entityType === "company" ? (
                      <form.Field name="taxId">
                        {(field) => (
                          <FormField
                            label={t("newContact.taxId")}
                            htmlFor={field.name}
                            error={
                              field.state.meta.isTouched
                                ? fieldError(field.state.meta.errors)
                                : undefined
                            }
                          >
                            <ThaiIdInput
                              value={field.state.value}
                              onChange={(v) => field.handleChange(v)}
                              ariaLabel={t("newContact.taxId")}
                            />
                          </FormField>
                        )}
                      </form.Field>
                    ) : (
                      <form.Field name="nationalId">
                        {(field) => (
                          <FormField
                            label={t("newContact.nationalId")}
                            htmlFor={field.name}
                            error={
                              field.state.meta.isTouched
                                ? fieldError(field.state.meta.errors)
                                : undefined
                            }
                          >
                            <ThaiIdInput
                              value={field.state.value}
                              onChange={(v) => field.handleChange(v)}
                              ariaLabel={t("newContact.nationalId")}
                            />
                          </FormField>
                        )}
                      </form.Field>
                    )
                  }
                </form.Subscribe>

                <form.Subscribe selector={(s) => s.values.entityType}>
                  {(entityType) =>
                    entityType === "company" ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <form.Field name="companyNameEn">
                            {(field) => (
                              <FormField
                                label={t("newContact.companyNameEn")}
                                htmlFor={field.name}
                              >
                                <Input
                                  id={field.name}
                                  value={field.state.value}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  placeholder="Acme Corp Ltd"
                                />
                              </FormField>
                            )}
                          </form.Field>
                          <form.Field name="companyNameTh">
                            {(field) => (
                              <FormField
                                label={t("newContact.companyNameTh")}
                                htmlFor={field.name}
                              >
                                <Input
                                  id={field.name}
                                  value={field.state.value}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  placeholder="บริษัท แอ็คมี จำกัด"
                                />
                              </FormField>
                            )}
                          </form.Field>
                        </div>
                      </>
                    ) : null
                  }
                </form.Subscribe>

                <div className="flex flex-col gap-1.5">
                  <Label>{t("persona.address")}</Label>
                  <form.Subscribe
                    selector={(s) => ({
                      address: s.values.address,
                      addressTh: s.values.addressTh,
                      zip: s.values.zip,
                      country: s.values.country,
                    })}
                  >
                    {(values) => (
                      <AddressLabelField
                        values={values}
                        onChange={(patch) => {
                          if (patch.address !== undefined)
                            form.setFieldValue("address", patch.address);
                          if (patch.addressTh !== undefined)
                            form.setFieldValue("addressTh", patch.addressTh);
                          if (patch.zip !== undefined)
                            form.setFieldValue("zip", patch.zip);
                          if (patch.country !== undefined)
                            form.setFieldValue("country", patch.country);
                        }}
                      />
                    )}
                  </form.Subscribe>
                </div>

                <form.Subscribe selector={(s) => s.values.entityType}>
                  {(entityType) =>
                    entityType === "company" ? (
                      <form.Field name="useSameAddress">
                        {(sameField) => (
                          <div className="space-y-2.5">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox
                                checked={sameField.state.value}
                                onCheckedChange={(v) =>
                                  sameField.handleChange(!!v)
                                }
                              />
                              {t("persona.useSameAddress", {
                                defaultValue:
                                  "Company address is the same as above",
                              })}
                            </label>

                            {!sameField.state.value && (
                              <div className="flex flex-col gap-1.5">
                                <Label>{t("persona.companyAddress")}</Label>
                                <form.Subscribe
                                  selector={(s) => ({
                                    address: s.values.companyAddress,
                                    addressTh: s.values.companyAddressTh,
                                    zip: s.values.companyZip,
                                    country: s.values.companyCountry,
                                  })}
                                >
                                  {(values) => (
                                    <AddressLabelField
                                      values={values}
                                      onChange={(patch) => {
                                        if (patch.address !== undefined)
                                          form.setFieldValue(
                                            "companyAddress",
                                            patch.address,
                                          );
                                        if (patch.addressTh !== undefined)
                                          form.setFieldValue(
                                            "companyAddressTh",
                                            patch.addressTh,
                                          );
                                        if (patch.zip !== undefined)
                                          form.setFieldValue(
                                            "companyZip",
                                            patch.zip,
                                          );
                                        if (patch.country !== undefined)
                                          form.setFieldValue(
                                            "companyCountry",
                                            patch.country,
                                          );
                                      }}
                                    />
                                  )}
                                </form.Subscribe>
                              </div>
                            )}
                          </div>
                        )}
                      </form.Field>
                    ) : null
                  }
                </form.Subscribe>
              </div>
            )}
          </div>

          <div className="drawer-footer justify-between">
            <button
              type="button"
              onClick={() => (step === 1 ? close() : setStep(1))}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {step === 2 && <ArrowLeft size={14} />}
              {step === 1 ? t("newContact.cancel") : t("newContact.back")}
            </button>

            {step === 1 ? (
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
              >
                {t("newContact.continue")}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t("newContact.saving")}
                  </>
                ) : (
                  t("newContact.addContact")
                )}
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
