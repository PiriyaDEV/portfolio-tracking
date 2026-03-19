"use client";

import { Suspense, useState } from "react";
import MainApp from "../main-page";
import SplashScreen from "@/shared/components/common/SplashScreen";

export default function MainPage() {
  // "visible" = splash showing, "exiting" = fade out playing, "done" = unmounted
  const [splashState, setSplashState] = useState<
    "visible" | "exiting" | "done"
  >("visible");

  const handleReady = () => {
    if (splashState !== "visible") return;
    setSplashState("exiting");
    // Unmount splash after exit animation (600ms)
    setTimeout(() => setSplashState("done"), 650);
  };

  return (
    <>
      {splashState !== "done" && (
        <SplashScreen exiting={splashState === "exiting"} />
      )}
      <Suspense fallback={null}>
        <MainApp onReady={handleReady} />
      </Suspense>
    </>
  );
}
