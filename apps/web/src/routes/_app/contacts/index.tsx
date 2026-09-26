import { ContactsIndexRedirect } from "@/components/contacts/contacts-index-redirect";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/contacts/")({
  component: ContactsIndexRedirect,
});
