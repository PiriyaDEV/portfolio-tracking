"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "@/shared/components/modal/LoginModal";
import CommonLoading from "@/shared/components/common/CommonLoading";

const SESSION_KEY = "portfolio_session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  // If valid session exists → skip login, go straight to /main
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
    if (!userId) {
      setLoginError("กรุณากรอกรหัสผ่าน");
      return;
    }
    setIsLoading(true);
    setLoginError("");
    try {
      const response = await fetch(`/api/user/${userId}`);
      if (!response.ok) throw new Error("ไม่เจอผู้ใช้งาน");

      const responseText = await response.text();
      let userColId = userId;

      if (
        responseText &&
        responseText.trim() !== "" &&
        responseText.trim() !== '""'
      ) {
        const data = JSON.parse(responseText);
        userColId =
          typeof data.userId === "string" && data.userId.startsWith('"')
            ? JSON.parse(data.userId)
            : data.userId || userId;
      }

      // Save session to localStorage
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          userId,
          userColId,
          expiresAt: Date.now() + SESSION_DURATION,
        }),
      );

      // Set lightweight cookie for middleware guard
      document.cookie = `${SESSION_KEY}=1; max-age=${30 * 24 * 60 * 60}; path=/`;

      router.replace("/main");
    } catch (err: any) {
      setLoginError(err.message || "ไม่เจอผู้ใช้งาน");
      setIsLoading(false);
    }
  }

  // Show nothing while checking session (avoids flash of login screen)
  if (isLoading) return <CommonLoading />;

  return (
    <LoginModal
      isLoggedIn={false}
      isLoading={isLoading}
      userId={userId}
      loginError={loginError}
      setUserId={setUserId}
      handleLogin={handleLogin}
    />
  );
}
