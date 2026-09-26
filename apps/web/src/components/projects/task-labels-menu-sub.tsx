import type { Label } from "@/components/projects/types";
import {
 ContextMenuItem,
 ContextMenuSub,
 ContextMenuSubContent,
 ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
 DropdownMenuItem,
 DropdownMenuSub,
 DropdownMenuSubContent,
 DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "@/components/icons";
import { MenuItemRow } from "@/components/ui/menu-item-row";
import { useLabels } from "@/hooks/use-labels";
import { useTranslation } from "react-i18next";

export function TaskLabelsMenuSub({
 root,
 selected,
 onChange,
}: {
 root: "dropdown" | "context";
 selected: Label[];
 onChange: (labels: Label[]) => void;
}) {
 const { t } = useTranslation("projects");
 const { labels } = useLabels();
 const selectedIds = new Set(selected.map((l) => l.id));
 const Sub = root === "dropdown" ? DropdownMenuSub : ContextMenuSub;
 const SubTrigger =
 root === "dropdown" ? DropdownMenuSubTrigger : ContextMenuSubTrigger;
 const SubContent =
 root === "dropdown" ? DropdownMenuSubContent : ContextMenuSubContent;
 const Item = root === "dropdown" ? DropdownMenuItem : ContextMenuItem;

 function toggle(label: Label) {
 onChange(
 selectedIds.has(label.id)
 ? selected.filter((l) => l.id !== label.id)
 : [...selected, label],
 );
 }

 return (
 <Sub>
 <SubTrigger>
  <Tag size={14} strokeWidth={1.75} />
  {t("taskMenu.labels")}
 </SubTrigger>
 <SubContent className="max-h-[min(320px,50vh)] overflow-y-auto">
 {labels.length === 0 ? (
 <Item disabled className="text-muted-foreground">
 {t("labelPicker.empty")}
 </Item>
 ) : (
 labels.map((label) => {
 const active = selectedIds.has(label.id);
 return (
 <Item
 key={label.id}
 onSelect={(e) => {
 e.preventDefault();
 toggle(label);
 }}
                >
                  <MenuItemRow active={active}>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: label.color }}
                    />
                    <span className="truncate">{label.name}</span>
                  </MenuItemRow>
                </Item>
 );
 })
 )}
 </SubContent>
 </Sub>
 );
}
