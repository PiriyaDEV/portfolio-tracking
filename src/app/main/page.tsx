// app/main/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainApp from "../main-page";
import SplashScreen from "@/shared/components/common/SplashScreen";
import { SESSION_KEY } from "../lib/constants";
import { useSplash } from "@/shared/hooks/useSplash";

export default function MainPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const { splashState, exitSplash } = useSplash("visible");

  // Guard: redirect to login if no valid session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (Date.now() < session.expiresAt) {
          setAuthChecked(true); // session valid → allow render
          return;
        }
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
    router.replace("/"); // no valid session → back to login
  }, []);

  // MainApp calls this when its data/content is ready
  const handleReady = () => exitSplash();

  if (!authChecked) return <SplashScreen exiting={false} />;

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