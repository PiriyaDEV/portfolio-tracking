"use client";

import React, { useEffect, useRef, useState } from "react";
import CommonLoading from "../../common/CommonLoading";
import { validateNewPassword } from "@/app/lib/password.utils";
import { PasswordStrengthHint } from "../../common/PasswordHint";

type Props = {
  isLoggedIn: boolean;
  isLoading: boolean;
  username: string;
  password: string;
  loginError: string | null;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  handleLogin: () => void;
};

// ---------------------------------------------------------
// Register Modal
// ---------------------------------------------------------
const INVITE_CODE = "POUNDINVITEYOU";

function RegisterModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"invite" | "userId">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

  // ── Username uniqueness check ──
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleUsernameChange = (value: string) => {
    const trimmed = value.slice(0, 32);
    setNewUsername(trimmed);
    setUsernameStatus("idle");
    if (usernameCheckTimeout.current)
      clearTimeout(usernameCheckTimeout.current);
    if (!trimmed.trim()) return;
    usernameCheckTimeout.current = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const res = await fetch(
          `/api/profile/check-username?username=${encodeURIComponent(trimmed.trim())}`,
        );
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("error");
      }
    }, 500);
  };

  const handleInviteSubmit = () => {
    if (inviteCode.trim().toUpperCase() === INVITE_CODE) {
      setInviteError("");
      setStep("userId");
    } else {
      setInviteError("รหัสเชิญไม่ถูกต้อง");
      setInviteCode("");
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword || !confirmPassword) return;
    const pwError = validateNewPassword(newPassword, confirmPassword);
    if (pwError) {
      setCreateError(pwError);
      return;
    }
    if (usernameStatus === "checking") {
      setCreateError("กำลังตรวจสอบชื่อผู้ใช้ กรุณารอสักครู่");
      return;
    }
    if (usernameStatus === "taken") {
      setCreateError("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
      return;
    }

    setIsCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) setCreateError(data.error || "เกิดข้อผิดพลาด");
      else setCreateSuccess(true);
    } catch {
      setCreateError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setIsCreating(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "13px 16px",
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const usernameBorderColor =
    usernameStatus === "taken"
      ? "rgba(255,59,48,0.6)"
      : usernameStatus === "available"
        ? "rgba(52,199,89,0.6)"
        : "rgba(255,255,255,0.12)";

  const confirmPasswordBorderColor =
    confirmPassword === ""
      ? "rgba(255,255,255,0.12)"
      : confirmPassword === newPassword
        ? "rgba(52,199,89,0.6)"
        : "rgba(255,59,48,0.6)";

  const usernameStatusLabel = () => {
    if (!newUsername.trim() || usernameStatus === "idle") return null;
    if (usernameStatus === "checking")
      return (
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
          กำลังตรวจสอบ...
        </span>
      );
    if (usernameStatus === "available")
      return (
        <span className="!text-green-600" style={{ fontSize: 11 }}>
          ✓ ใช้ได้
        </span>
      );
    if (usernameStatus === "taken")
      return (
        <span className="!text-red-600" style={{ fontSize: 11 }}>
          ✕ ถูกใช้งานแล้ว
        </span>
      );
    if (usernameStatus === "error")
      return (
        <span className="!text-yellow-600" style={{ fontSize: 11 }}>
          ⚠ ตรวจสอบไม่ได้
        </span>
      );
    return null;
  };

  const confirmPasswordStatusLabel = () => {
    if (!confirmPassword) return null;
    if (confirmPassword === newPassword)
      return (
        <span className="!text-green-600" style={{ fontSize: 11 }}>
          ✓ รหัสผ่านตรงกัน
        </span>
      );
    return (
      <span className="!text-red-600" style={{ fontSize: 11 }}>
        ✕ รหัสผ่านไม่ตรงกัน
      </span>
    );
  };

  // ── Only require: username filled, password ≥4 chars, passwords match, username not taken ──
  const canCreate =
    !isCreating &&
    !!newUsername &&
    newPassword.length >= 4 &&
    !!confirmPassword &&
    newPassword === confirmPassword &&
    usernameStatus !== "taken" &&
    usernameStatus !== "checking";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(145deg, rgba(28,28,36,0.97) 0%, rgba(18,18,26,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: "36px 32px",
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "inherit",
                marginBottom: 4,
              }}
            >
              {step === "invite" ? "ขั้นตอนที่ 1 / 2" : "ขั้นตอนที่ 2 / 2"}
            </p>
            <h2
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 20,
                fontWeight: 600,
                fontFamily: "'SF Pro Display', -apple-system, sans-serif",
              }}
            >
              {step === "invite" ? "รหัสเชิญ" : "สร้างบัญชี"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              color: "rgba(255,255,255,0.5)",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background:
                  (step === "invite" && i === 0) ||
                  (step === "userId" && i <= 1)
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(255,255,255,0.15)",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>

        {createSuccess ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(52,199,89,0.15)",
                border: "2px solid rgba(52,199,89,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              ✓
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              สร้างบัญชีสำเร็จ!
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              ชื่อผู้ใช้:{" "}
              <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                {newUsername}
              </span>
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: 8,
                background: "rgba(255,255,255,0.9)",
                color: "#111",
                border: "none",
                borderRadius: 12,
                padding: "10px 32px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              เข้าสู่ระบบ
            </button>
          </div>
        ) : step === "invite" ? (
          <>
            <p
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              กรอกรหัสเชิญที่ได้รับเพื่อสร้างบัญชีใหม่
            </p>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInviteSubmit()}
              placeholder="รหัสเชิญ"
              autoFocus
              style={{
                ...inputStyle,
                border: `1px solid ${inviteError ? "rgba(255,59,48,0.6)" : "rgba(255,255,255,0.12)"}`,
                letterSpacing: "0.08em",
              }}
            />
            {inviteError && (
              <p
                style={{
                  color: "rgba(255,59,48,0.9)",
                  fontSize: 12,
                  marginTop: -12,
                }}
              >
                * {inviteError}
              </p>
            )}
            <button
              onClick={handleInviteSubmit}
              disabled={!inviteCode}
              style={{
                background: inviteCode
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.1)",
                color: inviteCode ? "#111" : "rgba(255,255,255,0.3)",
                border: "none",
                borderRadius: 12,
                padding: "13px",
                fontWeight: 600,
                fontSize: 15,
                cursor: inviteCode ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              ถัดไป →
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              กรอกชื่อผู้ใช้และรหัสผ่านเพื่อสร้างบัญชีใหม่
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Username */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  >
                    ชื่อผู้ใช้
                  </span>
                  {usernameStatusLabel()}
                </div>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="ชื่อผู้ใช้ (username)"
                  autoFocus
                  style={{
                    ...inputStyle,
                    border: `1px solid ${usernameBorderColor}`,
                    transition: "border-color 0.2s",
                  }}
                />
              </div>

              {/* Password + informational strength hint */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                  รหัสผ่าน
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setCreateError("");
                  }}
                  placeholder="อย่างน้อย 4 ตัวอักษร"
                  style={inputStyle}
                />
                <PasswordStrengthHint password={newPassword} />
              </div>

              {/* Confirm password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  >
                    ยืนยันรหัสผ่าน
                  </span>
                  {confirmPasswordStatusLabel()}
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setCreateError("");
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && canCreate && handleCreateUser()
                  }
                  placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                  style={{
                    ...inputStyle,
                    border: `1px solid ${confirmPasswordBorderColor}`,
                    transition: "border-color 0.2s",
                  }}
                />
              </div>
            </div>

            {createError && (
              <p style={{ color: "rgba(255,59,48,0.9)", fontSize: 12 }}>
                * {createError}
              </p>
            )}
            <button
              onClick={handleCreateUser}
              disabled={!canCreate}
              style={{
                background: canCreate
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.1)",
                color: canCreate ? "#111" : "rgba(255,255,255,0.3)",
                border: "none",
                borderRadius: 12,
                padding: "13px",
                fontWeight: 600,
                fontSize: 15,
                cursor: canCreate ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              {isCreating
                ? "กำลังสร้าง..."
                : usernameStatus === "checking"
                  ? "กำลังตรวจสอบ..."
                  : "สร้างบัญชี"}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------
// Main Login Modal
// ---------------------------------------------------------
export default function LoginModal({
  isLoggedIn,
  isLoading,
  username,
  password,
  loginError,
  setUsername,
  setPassword,
  handleLogin,
}: Props) {
  const [showRegister, setShowRegister] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loginError) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
    }
  }, [loginError]);

  if (isLoggedIn) return null;
  if (isLoading) return <CommonLoading />;

  const canSubmit = !isLoading && username.trim() !== "" && password !== "";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 14,
    padding: "14px 16px",
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily:
      "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    transition: "border-color 0.2s",
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          fontFamily:
            "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            animation: "fadeDown 0.5s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                marginBottom: 4,
                boxShadow:
                  "0 8px 32px rgba(99,102,241,0.2), 0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
            >
              🔐
            </div>
            <h1
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              เข้าสู่ระบบ
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 13,
                margin: 0,
              }}
            >
              กรอกชื่อผู้ใช้และรหัสผ่าน
            </p>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              animation: shakeError ? "shake 0.5s ease" : "none",
            }}
          >
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleLogin()}
              placeholder="ชื่อผู้ใช้"
              autoComplete="username"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)";
              }}
            />
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && canSubmit && handleLogin()
                }
                placeholder="รหัสผ่าน"
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)";
                }}
              />
              <button
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
            <div style={{ height: 18, marginTop: -4 }}>
              {loginError && (
                <p
                  style={{
                    color: "rgba(255,59,48,0.9)",
                    fontSize: 13,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  * {loginError}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <button
              onClick={handleLogin}
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                border: "none",
                background: canSubmit
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.08)",
                color: canSubmit ? "#0d0d14" : "rgba(255,255,255,0.25)",
                fontWeight: 600,
                fontSize: 16,
                cursor: canSubmit ? "pointer" : "not-allowed",
                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
              }}
            >
              {isLoading ? "กำลังโหลด..." : "เข้าสู่ระบบ"}
            </button>
            <button
              onClick={() => setShowRegister(true)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.35)",
                fontSize: 13,
                cursor: "pointer",
                padding: "4px 8px",
                fontFamily: "inherit",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.35)";
              }}
            >
              สร้างแอคเคาท์ใหม่
            </button>
          </div>
        </div>
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}

      <style>{`
        @keyframes fadeDown { from { opacity: 0; transform: translateY(-12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes shake { 0%, 100% { transform: translateX(0) } 20% { transform: translateX(-8px) } 40% { transform: translateX(8px) } 60% { transform: translateX(-6px) } 80% { transform: translateX(6px) } }
      `}</style>
    </>
  );
}
