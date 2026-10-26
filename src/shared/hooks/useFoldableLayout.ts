"use client";

import { useEffect, useState } from "react";

// Folded poses use the real viewport segments. A wide continuous inner display
// uses the same companion layout, while ordinary phones remain unchanged.
const FOLDABLE_LAYOUT_QUERIES = [
  "(horizontal-viewport-segments: 2)",
  "(vertical-viewport-segments: 2)",
  "(device-posture: continuous) and (min-width: 650px)",
];

/** Detects a folded viewport or a wide unfolded foldable display. */
export function useFoldableLayout() {
  const [isFoldableLayout, setIsFoldableLayout] = useState(false);

  useEffect(() => {
    const mediaQueries = FOLDABLE_LAYOUT_QUERIES.map((query) =>
      window.matchMedia(query),
    );
    const update = () =>
      setIsFoldableLayout(mediaQueries.some((mediaQuery) => mediaQuery.matches));

    update();
    mediaQueries.forEach((mediaQuery) =>
      mediaQuery.addEventListener("change", update),
    );

    return () =>
      mediaQueries.forEach((mediaQuery) =>
        mediaQuery.removeEventListener("change", update),
      );
  }, []);

  return isFoldableLayout;
}
