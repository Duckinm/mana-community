import type { ApiContactPatchBody } from "@/lib/api-types";
import type { Contact, ContactCreateInput } from "@/components/contacts/types";
import { client, expectEden, expectEdenVoid } from "@/lib/eden";
import i18next from "@/lib/i18n";
import {
  invalidateContact,
  invalidateContacts,
} from "@/lib/invalidate-helpers";
import { makeOptimisticMutation } from "@/lib/optimistic-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";

export interface ContactsContextValue {
  contacts: Contact[];
  loading: boolean;
  isError: boolean;
  refetch: () => void;
  addContact: (contact: ContactCreateInput) => Promise<Contact>;
  updateContact: (patch: ApiContactPatchBody & { id: string }) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  importOpen: boolean;
  setImportOpen: (open: boolean) => void;
  newContactOpen: boolean;
  setNewContactOpen: (open: boolean) => void;
}

const ContactsContext = createContext<ContactsContextValue | null>(null);

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
  return ctx;
}

function useContactsContextValue(): ContactsContextValue {
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem("contacts-sidebar-open") !== "false";
    } catch {
      return true;
    }
  });
  const [importOpen, setImportOpen] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);

  function toggleSidebar() {
    setSidebarOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem("contacts-sidebar-open", String(next));
      } catch {}
      return next;
    });
  }

  const {
    data: contacts = [],
    isPending: loading,
    isError,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: queryKeys.contacts,
    queryFn: async () => expectEden(await client.api.contacts.get()),
  });

  const addMutation = useMutation({
    mutationFn: async (contact: ContactCreateInput) =>
      expectEden(await client.api.contacts.post(contact)),
    onSuccess: () => {
      void invalidateContacts(queryClient);
      toast.success(i18next.t("toast.contactAdded", { ns: "contacts" }));
    },
    onError: (_err, contact) =>
      toast.error(i18next.t("toast.addFailed", { ns: "contacts" }), {
        action: {
          label: i18next.t("retry", { ns: "common" }),
          onClick: () => addMutation.mutate(contact),
        },
      }),
  });

  const updateMutation = useMutation(
    makeOptimisticMutation<Contact, Error, ApiContactPatchBody & { id: string }>(
      queryClient,
      queryKeys.contacts,
      {
        mutationFn: async (patch) => {
          const { id, ...rest } = patch;
          return expectEden(await client.api.contacts({ id }).patch(rest));
        },
        optimisticUpdate: (prev, { id, ...rest }) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, ...rest, stage: rest.stage ?? c.stage, dealStatus: rest.dealStatus ?? c.dealStatus }
              : c,
          ),
        onSuccess: () =>
          toast.success(i18next.t("toast.contactSaved", { ns: "contacts" })),
        onError: (_err, patch) =>
          toast.error(i18next.t("toast.saveFailed", { ns: "contacts" }), {
            action: {
              label: i18next.t("retry", { ns: "common" }),
              onClick: () => updateMutation.mutate(patch),
            },
          }),
        onSettled: (_data, _err, patch) => {
          void invalidateContact(queryClient, patch.id);
        },
      },
    ),
  );

  const deleteMutation = useMutation(
    makeOptimisticMutation<Contact, Error, string>(
      queryClient,
      queryKeys.contacts,
      {
        mutationFn: async (id) => {
          expectEdenVoid(await client.api.contacts({ id }).delete());
          return { id } as Contact;
        },
        optimisticUpdate: (prev, id) => prev.filter((c) => c.id !== id),
        onSuccess: () =>
          toast.success(i18next.t("toast.contactDeleted", { ns: "contacts" })),
        onError: (_err, id) =>
          toast.error(i18next.t("toast.deleteFailed", { ns: "contacts" }), {
            action: {
              label: i18next.t("retry", { ns: "common" }),
              onClick: () => deleteMutation.mutate(id),
            },
          }),
      },
    ),
  );

  const refetch = () => {
    void invalidateContacts(queryClient);
    void refetchQuery();
  };
  const addContact = (contact: ContactCreateInput) =>
    addMutation.mutateAsync(contact);
  const updateContact = async (
    patch: ApiContactPatchBody & { id: string },
  ): Promise<void> => {
    await updateMutation.mutateAsync(patch);
  };
  const deleteContact = async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    contacts,
    loading,
    isError,
    refetch,
    addContact,
    updateContact,
    deleteContact,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    importOpen,
    setImportOpen,
    newContactOpen,
    setNewContactOpen,
  };
}

export function ContactsProvider({ children }: { children: ReactNode }) {
  const value = useContactsContextValue();
  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
}
