import type { ItemTemplate } from "@/hooks/use-item-templates";
import type { ItemTemplateGroup } from "@/hooks/use-item-template-groups";
import type { ReactNode } from "react";

export type TemplateLibraryTab = "templates" | "packages";

export type SortField = "name" | "price" | "qty" | "items" | "updated";
export type SortDir = "asc" | "desc";

export type TemplateInsertItem = {
  itemDescription: string;
  qty: number;
  amount: number;
};

export type RightPanel =
  | { type: "none" }
  | { type: "template-edit"; template: ItemTemplate | null }
  | { type: "package-detail"; group: ItemTemplateGroup }
  | { type: "package-edit"; group: ItemTemplateGroup | null };

export interface TemplateLibraryPanelProps {
  tab: TemplateLibraryTab;
  onTabChange: (tab: TemplateLibraryTab) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  sort?: string;
  onSortChange?: (sort: string) => void;
  onInsert?: (items: TemplateInsertItem[]) => void;
  currency?: string;
  onExpand?: () => void;
  extraTabs?: ReactNode;
  hideTabBar?: boolean;
  tabSize?: "sm" | "md";
  fitContent?: boolean;
}

export function parseSort(
  sort: string,
  fallback: string,
): [SortField, SortDir] {
  const [field, dir] = (sort || fallback).split("-");
  return [field as SortField, dir === "desc" ? "desc" : "asc"];
}

export function templateToInsert(
  template: Pick<
    ItemTemplate,
    "name" | "description" | "defaultQty" | "defaultUnitPriceCents"
  >,
): TemplateInsertItem {
  return {
    itemDescription: template.name,
    qty: template.defaultQty / 100,
    amount: template.defaultUnitPriceCents / 100,
  };
}
