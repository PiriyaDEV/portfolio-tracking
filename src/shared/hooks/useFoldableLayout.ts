"use client";

import { useEffect, useState } from "react";

// Only real viewport splits activate the companion layout. This deliberately
// leaves ordinary wide screens and the unfolded single viewport unchanged.
const FOLDABLE_LAYOUT_QUERIES = [
  "(horizontal-viewport-segments: 2)",
  "(vertical-viewport-segments: 2)",
];

/** Detects a real two-segment foldable viewport. */
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
