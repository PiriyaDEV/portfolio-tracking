"use client";

import { Suspense, useState } from "react";
import MainApp from "../main-page";
import SplashScreen from "@/shared/components/common/SplashScreen";

// page.tsx
export default function MainPage() {
  const [splashState, setSplashState] = useState<
    "visible" | "exiting" | "done"
  >("visible");

  const handleReady = () => {
    if (splashState !== "visible") return;
    setSplashState("exiting");
    setTimeout(() => setSplashState("done"), 650);
  };

  return (
    <>
      {splashState !== "done" && (
        <SplashScreen exiting={splashState === "exiting"} />
      )}
      <Suspense fallback={null}>
        <MainApp onReady={handleReady} isSplashDone={splashState === "done"} />
      </Suspense>
    </>
  );
}
