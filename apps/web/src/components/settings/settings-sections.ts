import {
  Bell,
  CreditCard,
  Palette,
  Puzzle,
  Shield,
  Tag,
  User,
} from "@/components/icons";
import { ManaSparkle } from "@/components/icons/mana-sparkle";
import type { ElementType } from "react";

export type SettingsSectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "ai"
  | "billing"
  | "integrations"
  | "labels"
  | "privacy";

export const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  icon: ElementType;
}[] = [
  { id: "profile", icon: User },
  { id: "appearance", icon: Palette },
  { id: "notifications", icon: Bell },
  { id: "ai", icon: ManaSparkle },
  { id: "billing", icon: CreditCard },
  { id: "integrations", icon: Puzzle },
  { id: "labels", icon: Tag },
  { id: "privacy", icon: Shield },
];

export const SETTINGS_SECTION_ROUTES: Record<SettingsSectionId, string> = {
  profile: "/settings/profile",
  appearance: "/settings/appearance",
  notifications: "/settings/notifications",
  ai: "/settings/ai",
  billing: "/settings/billing",
  integrations: "/settings/integrations",
  labels: "/settings/labels",
  privacy: "/settings/privacy",
};

export const SETTINGS_NO_SAVE = new Set<SettingsSectionId>([
  "privacy",
  "labels",
  "billing",
]);

export const SETTINGS_GROUPS: {
  id: "account" | "workspace" | "security";
  sectionIds: SettingsSectionId[];
}[] = [
  {
    id: "account",
    sectionIds: ["profile", "appearance", "notifications"],
  },
  {
    id: "workspace",
    sectionIds: ["ai", "billing", "integrations", "labels"],
  },
  {
    id: "security",
    sectionIds: ["privacy"],
  },
];

export function resolveSettingsSectionId(
  routeSegment: string | undefined,
): SettingsSectionId | null {
  if (!routeSegment) return null;
  return SETTINGS_SECTIONS.some((s) => s.id === routeSegment)
    ? (routeSegment as SettingsSectionId)
    : null;
}
