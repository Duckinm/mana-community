import { useEffect, useState } from "react";

// Mirrors --breakpoint-xl in styles/tailwind/theme-inline.css.
const BELOW_XL_MQ = "(max-width: 1023px)";

/** True below the xl shell breakpoint — used to thin chart tick density on phone/tablet. */
export function useBelowXl() {
  const [belowXl, setBelowXl] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(BELOW_XL_MQ).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(BELOW_XL_MQ);
    const onChange = () => setBelowXl(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return belowXl;
}
