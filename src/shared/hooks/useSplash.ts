// hooks/useSplash.ts
import { useState, useCallback } from "react";

type SplashState = "visible" | "exiting" | "done";

export function useSplash(initial: SplashState = "visible") {
  const [splashState, setSplashState] = useState<SplashState>(initial);

  const exitSplash = useCallback(() => {
    setSplashState((prev) => {
      if (prev !== "visible") return prev;
      return "exiting";
    });
    setTimeout(() => setSplashState("done"), 650);
  }, []);

  return { splashState, exitSplash };
}