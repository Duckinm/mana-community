import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Kanban, Table2 } from "@/components/icons";
import { useTranslation } from "react-i18next";

const VIEWS = [
  { key: "board", value: "board", icon: Kanban },
  { key: "table", value: "table", icon: Table2 },
] as const;

export type IssuesView = (typeof VIEWS)[number]["value"];

export function IssuesViewSwitcher({
  current,
  onViewChange,
}: {
  current: IssuesView;
  onViewChange: (view: IssuesView) => void;
}) {
  const { t } = useTranslation("projects");
  const currentView = VIEWS.find((v) => v.value === current)!;

  function switchTo(view: IssuesView) {
    if (view === current) return;
    onViewChange(view);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 gap-1.5 text-xs font-medium md:inline-flex"
        >
          <currentView.icon size={13} strokeWidth={1.75} />
          {t(`viewSwitcher.${currentView.key}`)}
          <ChevronDown size={12} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {VIEWS.map(({ key, value, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => switchTo(value)}
            className="gap-2"
          >
            <Icon size={13} strokeWidth={1.75} />
            {t(`viewSwitcher.${key}`)}
            {value === current && <Check size={12} className="ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
