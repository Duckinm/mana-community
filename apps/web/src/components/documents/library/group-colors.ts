export const GROUP_COLORS: {
  id: string;
  label: string;
  bg: string;
  dot: string;
  ring: string;
  accent: string;
  hoverRing: string;
}[] = [
  {
    id: "amber",
    label: "Amber",
    bg: "bg-amber-500/10",
    dot: "bg-amber-400",
    ring: "ring-amber-400",
    accent: "bg-amber-400",
    hoverRing: "hover:ring-amber-400/30",
  },
  {
    id: "teal",
    label: "Teal",
    bg: "bg-teal-500/10",
    dot: "bg-teal-400",
    ring: "ring-teal-400",
    accent: "bg-teal-400",
    hoverRing: "hover:ring-teal-400/30",
  },
  {
    id: "blue",
    label: "Blue",
    bg: "bg-blue-500/10",
    dot: "bg-blue-400",
    ring: "ring-blue-400",
    accent: "bg-blue-400",
    hoverRing: "hover:ring-blue-400/30",
  },
  {
    id: "purple",
    label: "Purple",
    bg: "bg-purple-500/10",
    dot: "bg-purple-400",
    ring: "ring-purple-400",
    accent: "bg-purple-400",
    hoverRing: "hover:ring-purple-400/30",
  },
  {
    id: "rose",
    label: "Rose",
    bg: "bg-rose-500/10",
    dot: "bg-rose-400",
    ring: "ring-rose-400",
    accent: "bg-rose-400",
    hoverRing: "hover:ring-rose-400/30",
  },
  {
    id: "orange",
    label: "Orange",
    bg: "bg-orange-500/10",
    dot: "bg-orange-400",
    ring: "ring-orange-400",
    accent: "bg-orange-400",
    hoverRing: "hover:ring-orange-400/30",
  },
  {
    id: "emerald",
    label: "Emerald",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400",
    accent: "bg-emerald-400",
    hoverRing: "hover:ring-emerald-400/30",
  },
  {
    id: "slate",
    label: "Slate",
    bg: "bg-slate-500/10",
    dot: "bg-slate-400",
    ring: "ring-slate-400",
    accent: "bg-slate-400",
    hoverRing: "hover:ring-slate-400/30",
  },
];

export function colorFor(id: string) {
  return GROUP_COLORS.find((c) => c.id === id) ?? GROUP_COLORS[0];
}
