import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ManaLogo } from "@/components/brand/mana-logo";
import { Link } from "@tanstack/react-router";

export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  const link = (
    <Link
      to="/chat"
      search={{ new: true }}
      aria-label="MANA home"
      className="shrink-0 size-9 flex items-center justify-center"
    >
      <ManaLogo
        compact
        alt=""
        className="shrink-0 size-9"
        aria-hidden
      />
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        MANA
      </TooltipContent>
    </Tooltip>
  );
}
