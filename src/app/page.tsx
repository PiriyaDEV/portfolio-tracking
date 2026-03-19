"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "@/shared/components/modal/LoginModal";
import CommonLoading from "@/shared/components/common/CommonLoading";
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_DURATION_MS,
  SESSION_KEY,
} from "./lib/constants";
import SplashScreen from "@/shared/components/common/SplashScreen";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  // If valid session exists → skip login
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (Date.now() < session.expiresAt) {
          router.replace("/main");
          return;
        }
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
    setIsLoading(false);
  }, []);

  async function handleLogin() {
    if (!username.trim() || !password) {
      setLoginError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    setIsLoading(true);
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

      // data.userId = column A (internal key for asset updates)
      // data.username = column D (display name)
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          userId: data.userId, // column A — used for POST /api/user/[id]
          username: data.username, // column D — display name
          expiresAt: Date.now() + SESSION_DURATION_MS,
        }),
      );

      router.replace("/main");
    } catch (err: any) {
      setLoginError(err.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      setIsLoading(false);
    }
  }

  if (isLoading) return <SplashScreen exiting={false} />;

  return (
    <LoginModal
      isLoggedIn={false}
      isLoading={isLoading}
      username={username}
      password={password}
      loginError={loginError}
      setUsername={setUsername}
      setPassword={setPassword}
      handleLogin={handleLogin}
    />
  );
}
