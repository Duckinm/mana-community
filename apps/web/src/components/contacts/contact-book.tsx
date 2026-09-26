import type { Contact } from "@/components/contacts/types";
import { Check } from "@/components/icons";
import { SearchBar } from "@/components/ui/search-bar";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export type SortMode = "alpha" | "projects";

const SORT_OPTIONS: { mode: SortMode; key: "sortAlpha" | "sortProjects" }[] = [
  { mode: "alpha", key: "sortAlpha" },
  { mode: "projects", key: "sortProjects" },
];

function activeProjectCount(contact: Contact): number {
  return (
    contact.activeProjectCount ??
    contact.linkedProjects.filter((p) => !p.archived).length
  );
}

function sortContacts(contacts: Contact[], mode: SortMode): Contact[] {
  const copy = [...contacts];
  if (mode === "alpha")
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy.sort((a, b) => activeProjectCount(b) - activeProjectCount(a));
}

export function ContactBook({
  contacts,
  selectedId,
  query,
  sort,
  onSelect,
  onSearch,
  onSort,
  selectedIds,
  selectionMode = false,
  onSelectionModeChange,
  onSelectionChange,
}: {
  contacts: Contact[];
  selectedId: string;
  query: string;
  sort: SortMode;
  onSelect: (id: string) => void;
  onSearch: (q: string) => void;
  onSort: (s: SortMode) => void;
  selectedIds?: Set<string>;
  selectionMode?: boolean;
  onSelectionModeChange?: (active: boolean) => void;
  onSelectionChange?: (ids: Set<string>) => void;
}) {
  const { t } = useTranslation("contacts");
  const sorted = sortContacts(contacts, sort);

  const visible = query.trim()
    ? sorted.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.company.toLowerCase().includes(query.toLowerCase()) ||
          c.role.toLowerCase().includes(query.toLowerCase()),
      )
    : sorted;

  const isBulkMode = !!onSelectionChange;
  const selected = selectedIds ?? new Set<string>();
  const showSelectionUi = selectionMode && selected.size > 0;
  const allVisibleSelected =
    visible.length > 0 && visible.every((c) => selected.has(c.id));
  function exitSelectionMode() {
    onSelectionModeChange?.(false);
  }

  function enterSelectionMode(contactId: string) {
    onSelectionModeChange?.(true);
    onSelectionChange?.(new Set([contactId]));
  }

  function toggleSelectAll() {
    if (!onSelectionChange) return;
    if (allVisibleSelected) {
      const next = new Set(selected);
      visible.forEach((c) => next.delete(c.id));
      onSelectionChange(next);
      exitSelectionMode();
    } else {
      const next = new Set(selected);
      visible.forEach((c) => next.add(c.id));
      onSelectionChange(next);
    }
  }

  function toggleOne(id: string) {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
    if (next.size === 0) exitSelectionMode();
  }

  function handleRowClick(contactId: string) {
    onSelect(contactId);
  }

  function handleRowKeyDown(e: React.KeyboardEvent, contactId: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(contactId);
    }
  }

  function handleCheckboxClick(e: React.MouseEvent, contactId: string) {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (!selectionMode) {
      enterSelectionMode(contactId);
    } else {
      toggleOne(contactId);
    }
  }

  useEffect(() => {
    if (visible.length > 0 && !visible.find((c) => c.id === selectedId)) {
      onSelect(visible[0].id);
    }
  }, [visible, selectedId, onSelect]);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="mb-4 flex shrink-0 items-center px-3 pt-4">
          <h2
            data-testid="contact-directory-heading"
            className="text-sm font-semibold text-foreground"
          >
            {t("book.directory")}
          </h2>
        </div>

        <div className="px-2.5 pb-1.5 shrink-0">
          <SearchBar
            value={query}
            onChange={onSearch}
            placeholder={t("book.searchPlaceholder")}
          />
        </div>

        <div className="px-2.5 pb-1.5 shrink-0">
          <div className="flex gap-1.5 rounded-xl bg-muted p-1">
            {SORT_OPTIONS.map(({ mode, key }) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sort === mode}
                onClick={() => onSort(mode)}
                className={`flex-1 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-base ${sort === mode ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}
              >
                {t(`book.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {isBulkMode && showSelectionUi && visible.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="px-1.5 pb-1 shrink-0 overflow-hidden"
            >
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl w-full text-left group"
              >
                <span className="flex-1 min-w-0 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {allVisibleSelected
                    ? t("book.deselectAll")
                    : t("book.selectAll")}
                  {` · ${t("book.selectedCount", { count: selected.size })}`}
                </span>
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span
                    className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all border"
                    style={{
                      background: allVisibleSelected
                        ? "var(--primary)"
                        : "transparent",
                      borderColor: allVisibleSelected
                        ? "var(--primary)"
                        : "var(--border-default)",
                    }}
                  >
                    {allVisibleSelected && (
                      <Check
                        size={9}
                        strokeWidth={3}
                        className="text-primary-foreground"
                      />
                    )}
                  </span>
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges] @container">
          <div className="flex flex-col gap-0.5 px-2.5 pb-3">
            <AnimatePresence initial={false}>
              {visible.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-center py-8 text-caption"
                >
                  {query.trim()
                    ? t("book.noMatch", { query })
                    : t("book.noneYet")}
                </motion.p>
              ) : (
                visible.map((contact, i) => {
                  const isActive = contact.id === selectedId;
                  const isChecked = selected.has(contact.id);
                  const projectCount = activeProjectCount(contact);
                  return (
                    <motion.div
                      key={contact.id}
                      role="button"
                      tabIndex={0}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{
                        delay: i * 0.02,
                        duration: 0.18,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onClick={() => handleRowClick(contact.id)}
                      onKeyDown={(e) => handleRowKeyDown(e, contact.id)}
                      className="group relative flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left transition-colors duration-base"
                      style={{
                        background: isActive
                          ? "var(--primary-soft)"
                          : "transparent",
                        border: isActive
                          ? "1px solid var(--primary-border)"
                          : "1px solid transparent",
                      }}
                    >
                      <p
                        className="min-w-0 flex-1 truncate text-xs font-medium"
                        style={{
                          color: isActive
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        {contact.name}
                      </p>
                      <div
                        className="relative size-4 shrink-0"
                        title={
                          projectCount > 0
                            ? t("book.projectCount", { count: projectCount })
                            : undefined
                        }
                      >
                        {isBulkMode && (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isChecked}
                            aria-label={t("book.selectContact", {
                              name: contact.name,
                            })}
                            onClick={(e) => handleCheckboxClick(e, contact.id)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className={`peer absolute inset-0 z-10 flex items-center justify-center rounded transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isChecked || showSelectionUi ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
                          >
                            <span
                              className="flex size-3.5 items-center justify-center rounded border transition-all"
                              style={{
                                background: isChecked
                                  ? "var(--primary)"
                                  : "transparent",
                                borderColor: isChecked
                                  ? "var(--primary)"
                                  : "var(--border-default)",
                              }}
                            >
                              {isChecked && (
                                <Check
                                  size={9}
                                  strokeWidth={3}
                                  className="text-primary-foreground"
                                />
                              )}
                            </span>
                          </button>
                        )}
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-2xs tabular-nums text-caption transition-opacity duration-fast peer-focus-visible:opacity-0 ${isChecked || showSelectionUi ? "opacity-0" : isBulkMode ? "opacity-100 group-hover:opacity-0" : "opacity-100"}`}
                        >
                          {projectCount > 0 ? projectCount : null}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
