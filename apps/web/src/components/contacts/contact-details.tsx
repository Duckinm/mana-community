import { MaskedIdValue } from "@/components/contacts/masked-id-value";
import { metViaLabel } from "@/components/contacts/met-via";
import { ProjectLinkBadge } from "@/components/projects/project-badge";
import type { Contact } from "@/components/contacts/types";
import { useProjects } from "@/context/projects";
import { formatTimestampDistance } from "@/lib/timestamp";
import { phoneHref, splitPhoneNumbers } from "@/lib/phone-numbers";
import { Globe, Mail, Phone } from "@/components/icons";
import { useTranslation } from "react-i18next";

export function ContactDetails({ contact }: { contact: Contact }) {
  const { t } = useTranslation("contacts");
  const { projects } = useProjects();
  const linkedProjects = projects.filter(
    (p) => !p.archived && p.contactId === contact.id,
  );

  return (
    <div className="space-y-4 pb-3 @max-xs/details:space-y-3">
      <h2 className="mb-4 text-sm font-medium text-foreground">
        {t("details.personalInformation")}
      </h2>

      {contact.email && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("details.email")}
          </p>
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 truncate text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <Mail size={13} strokeWidth={2} className="shrink-0" />
            {contact.email}
          </a>
        </div>
      )}
      {contact.phone && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("details.phone")}
          </p>
          <div className="space-y-1">
            {splitPhoneNumbers(contact.phone).map((phone, index) => (
              <a
                key={`${phone}-${index}`}
                href={phoneHref(phone)}
                className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                <Phone size={13} strokeWidth={2} className="shrink-0" />
                {phone}
              </a>
            ))}
          </div>
        </div>
      )}
      {contact.website && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("details.website")}
          </p>
          <a
            href={`https://${contact.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            <Globe size={13} strokeWidth={2} className="shrink-0" />
            {contact.website}
          </a>
        </div>
      )}
      {contact.lastContactedAt && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("details.lastContacted")}
          </p>
          <time
            dateTime={contact.lastContactedAt}
            className="text-sm font-medium text-foreground"
          >
            {formatTimestampDistance(contact.lastContactedAt)}
          </time>
        </div>
      )}
      {contact.metVia && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("details.metVia")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {metViaLabel(contact.metVia, t)}
          </p>
        </div>
      )}

      {(contact.companyNameEn ||
        contact.companyNameTh ||
        contact.taxId ||
        contact.nationalId) && (
        <div>
          {contact.companyNameEn && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("details.companyNameEn")}
              </p>
              <p className="text-sm font-medium text-foreground">
                {contact.companyNameEn}
              </p>
            </div>
          )}
          {contact.companyNameTh && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("details.companyNameTh")}
              </p>
              <p className="text-sm font-medium text-foreground">
                {contact.companyNameTh}
              </p>
            </div>
          )}
          {contact.taxId && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("details.taxId")}
              </p>
              <p className="text-sm font-medium text-foreground">
                <MaskedIdValue value={contact.taxId} />
              </p>
            </div>
          )}
          {contact.nationalId && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("details.nationalId")}
              </p>
              <p className="text-sm font-medium text-foreground">
                <MaskedIdValue value={contact.nationalId} />
              </p>
            </div>
          )}
        </div>
      )}

      {(contact.address ||
        contact.addressTh ||
        contact.zip ||
        contact.country) && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">
            {t("details.address")}
          </p>
          {contact.address && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("details.address")}
              </p>
              <p className="text-sm font-medium leading-snug text-foreground">
                {contact.address}
              </p>
            </div>
          )}
          {contact.addressTh && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("details.addressTh")}
              </p>
              <p className="text-sm font-medium leading-snug text-foreground">
                {contact.addressTh}
              </p>
            </div>
          )}
          {(contact.zip || contact.country) && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("details.zipCountry")}
              </p>
              <p className="text-sm font-medium text-foreground">
                {[contact.zip, contact.country].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}
        </div>
      )}

      {linkedProjects.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("details.projects")}
          </p>
          <div className="flex flex-col gap-1.5">
            {linkedProjects.map((p) => (
              <ProjectLinkBadge key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
