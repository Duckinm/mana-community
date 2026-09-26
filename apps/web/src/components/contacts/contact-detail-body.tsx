import { ContactBriefingCard } from "@/components/contacts/contact-briefing-card";
import { ContactStats } from "@/components/contacts/contact-stats";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { ContactFilesTab } from "@/components/contacts/files-tab";
import type { Contact } from "@/components/contacts/types";

export function ContactDetailBody({
  contact,
  contactId,
}: {
  contact: Contact;
  contactId: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ContactStats contact={contact} />
      <div className="flex flex-col gap-3">
        <ContactBriefingCard contactId={contactId} />
        <ContactFilesTab contact={contact} />
      </div>
      <ContactTimeline contactId={contactId} />
    </div>
  );
}
