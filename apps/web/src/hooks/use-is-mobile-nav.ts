import { useEffect, useState } from "react";

// Mirrors --breakpoint-xl in styles/tailwind/theme-inline.css.
const MOBILE_NAV_MQ = "(max-width: 1023px)";

export function useIsMobileNav() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_NAV_MQ).matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_NAV_MQ);
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
