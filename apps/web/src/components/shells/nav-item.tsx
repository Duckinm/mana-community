import { ChevronDown, ChevronRight } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
  collapsed,
  chevron,
  chevronOpen,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  chevron?: boolean;
  chevronOpen?: boolean;
}) {
  const isExternal = to.startsWith("http");
  const sharedProps = {
    className:
      "flex items-center px-2.5 h-8 gap-2.5 rounded-md transition-colors mx-2",
    style: {
      background: isActive ? "var(--primary-soft)" : "transparent",
      color: isActive ? "var(--text-primary)" : "var(--text-muted)",
    },
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isActive) e.currentTarget.style.background = "var(--border-subtle)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isActive) e.currentTarget.style.background = "transparent";
    },
  };
  const inner = (
    <>
      <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
      <span
        className={cn(
          "text-[0.8125rem] whitespace-nowrap overflow-hidden flex-1 transition-[max-width,opacity]",
          isActive ? "font-medium" : "font-normal",
        )}
        style={{
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          transitionDuration: "220ms, 150ms",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1), ease",
        }}
      >
        {label}
      </span>
      {chevron &&
        !collapsed &&
        (chevronOpen ? (
          <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
        ))}
    </>
  );

  const link = isExternal ? (
    <a href={to} target="_blank" rel="noreferrer" {...sharedProps}>
      {inner}
    </a>
  ) : (
    <Link to={to} {...sharedProps}>
      {inner}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function SectionLabel({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  return (
    <div
      className="overflow-hidden transition-[max-height,opacity,margin-bottom]"
      style={{
        maxHeight: collapsed ? 0 : 24,
        opacity: collapsed ? 0 : 1,
        marginTop: collapsed ? 0 : 16,
        marginBottom: collapsed ? 0 : 8,
        paddingLeft: 18,
        transitionDuration: "220ms, 150ms, 220ms",
        transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1), ease, ease",
      }}
    >
      <span
        className="text-[0.6875rem] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </span>
    </div>
  );
}
