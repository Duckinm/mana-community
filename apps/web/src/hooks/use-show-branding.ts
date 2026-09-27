import { useSettings } from "@/context/settings";

export function useShowBranding(): boolean {
  const { user } = useSettings();
  return !user || !user.hideBranding;
}
