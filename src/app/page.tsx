// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "@/shared/components/modal/LoginModal";
import SplashScreen from "@/shared/components/common/SplashScreen";
import {
  SESSION_DURATION_MS,
  SESSION_KEY,
} from "./lib/constants";
import { useSplash } from "@/shared/hooks/useSplash";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Splash starts visible; we exit it once session check is done
  const { splashState, exitSplash } = useSplash("visible");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (Date.now() < session.expiresAt) {
          // Valid session → go to /main (splash will show there)
          router.replace("/main");
          return;
        }
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
    // No valid session → exit splash, show login
    exitSplash();
  }, []);

  async function handleLogin() {
    if (!username.trim() || !password) {
      setLoginError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    setIsSubmitting(true);
    setLoginError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          userId: data.userId,
          username: data.username,
          expiresAt: Date.now() + SESSION_DURATION_MS,
        })
      );

      router.replace("/main");
    } catch (err: any) {
      setLoginError(err.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {splashState !== "done" && (
        <SplashScreen exiting={splashState === "exiting"} />
      )}
      {splashState === "done" && (
        <LoginModal
          isLoggedIn={false}
          isLoading={isSubmitting}
          username={username}
          password={password}
          loginError={loginError}
          setUsername={setUsername}
          setPassword={setPassword}
          handleLogin={handleLogin}
        />
      )}
    </>
  );
}