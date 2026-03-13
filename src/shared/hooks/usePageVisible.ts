import { useEffect, useState } from "react";

/**
 * Returns true when the page is visible (user has the tab focused/active).
 * Uses the Page Visibility API — pauses when the tab is hidden or minimized.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible;
}
