import { Layers, List, ChevronDown } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

const LAST_DOCUMENTS_VIEW_KEY = "fos:last-documents-view";

const VIEWS = [
  { key: "chronological", value: "chronological", icon: List },
  { key: "byType", value: "by-type", icon: Layers },
] as const;

export type DocumentsView = (typeof VIEWS)[number]["value"];

export function getLastDocumentsView(): DocumentsView {
  try {
    if (localStorage.getItem(LAST_DOCUMENTS_VIEW_KEY) === "by-type") {
      return "by-type";
    }
  } catch {}
  return "chronological";
}

export function setLastDocumentsView(view: DocumentsView) {
  try {
    localStorage.setItem(LAST_DOCUMENTS_VIEW_KEY, view);
  } catch {}
}

export function DocumentViewSwitcher({
  current,
  onViewChange,
}: {
  current: DocumentsView;
  onViewChange: (view: DocumentsView) => void;
}) {
  const { t } = useTranslation("documents");
  const currentView = VIEWS.find((view) => view.value === current)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t(`viewSwitcher.${currentView.key}`)}
          className="h-9 shrink-0 gap-1.5 text-xs font-medium sm:h-8"
        >
          <currentView.icon size={13} strokeWidth={1.75} />
          <span className="hidden sm:inline">
            {t(`viewSwitcher.${currentView.key}`)}
          </span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => onViewChange(value as DocumentsView)}
        >
          {VIEWS.map(({ key, value, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-2">
              <Icon size={13} strokeWidth={1.75} />
              {t(`viewSwitcher.${key}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
