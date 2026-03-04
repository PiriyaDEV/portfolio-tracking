"use client";

import React, { useEffect, useState, useRef } from "react";
import CommonLoading from "../../common/CommonLoading";

type Props = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string;
  loginError: string | null;
  setUserId: (value: string) => void;
  handleLogin: () => void;
};

// ---------------------------------------------------------
// Passcode Dots
// ---------------------------------------------------------
function PasscodeDots({ value, length }: { value: string; length: number }) {
  return (
    <div className="flex gap-3 my-2">
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        return (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.7)",
              background: filled
                ? "rgba(255,255,255,0.95)"
                : "rgba(255,255,255,0.08)",
              transition: "background 0.15s ease, transform 0.12s ease",
              transform: filled ? "scale(1.15)" : "scale(1)",
              boxShadow: filled ? "0 0 8px rgba(255,255,255,0.4)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------
// iOS Passcode Component
// ---------------------------------------------------------
function IOSPasscode({
  value,
  length = 6,
  onChange,
  onSubmit,
}: {
  value: string;
  length: number;
  onChange: (v: string) => void;
  onSubmit?: () => void;
}) {
  const addDigit = (d: string) => {
    if (value.length >= length) return;
    const v = value + d;
    onChange(v);
  };

  const removeDigit = () => {
    if (value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  const keypad = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "⌫"],
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <PasscodeDots value={value} length={length} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {keypad.flat().map((key, i) => {
          if (key === "") return <div key={i} />;

          const isBackspace = key === "⌫";
          return (
            <button
              key={i}
              onClick={isBackspace ? removeDigit : () => addDigit(key)}
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                background: isBackspace
                  ? "transparent"
                  : "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.92)",
                fontSize: isBackspace ? 20 : 26,
                fontWeight: isBackspace ? 400 : 300,
                fontFamily:
                  "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: "0.02em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.1s, transform 0.1s",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  isBackspace
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.22)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(0.94)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  isBackspace ? "transparent" : "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  isBackspace ? "transparent" : "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Register Modal
// ---------------------------------------------------------
const INVITE_CODE = "POUNDINVITEYOU"; // Change this to your actual invite code

function RegisterModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"invite" | "userId">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [username, setUsername] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

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
    if (!newUserId || !username) return;
    setIsCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUserId, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "เกิดข้อผิดพลาด");
      } else {
        setCreateSuccess(true);
      }
    } catch {
      setCreateError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setIsCreating(false);
    }
  };

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
              รหัสผู้ใช้:{" "}
              <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                {newUserId}
              </span>
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              ชื่อที่แสดง:{" "}
              <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                {username}
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
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${inviteError ? "rgba(255,59,48,0.6)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 12,
                padding: "13px 16px",
                color: "rgba(255,255,255,0.9)",
                fontSize: 15,
                letterSpacing: "0.08em",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
            />
            {inviteError && (
              <p
                className="!text-red-500"
                style={{
                  color: "rgba(255,59,48,0.9) !important",
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
              กรอกรหัสผู้ใช้ (4 หลัก) และชื่อที่แสดง
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                value={newUserId}
                onChange={(e) =>
                  setNewUserId(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="รหัสผู้ใช้ (4 หลัก)"
                maxLength={4}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  padding: "13px 16px",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 15,
                  letterSpacing: "0.2em",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อที่แสดง"
                style={{
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
                }}
              />
            </div>
            {createError && (
              <p
                className="!text-red-500"
                style={{ color: "rgba(255,59,48,0.9)", fontSize: 12 }}
              >
                * {createError}
              </p>
            )}
            <button
              onClick={handleCreateUser}
              disabled={isCreating || newUserId.length !== 4 || !username}
              style={{
                background:
                  !isCreating && newUserId.length === 4 && username
                    ? "rgba(255,255,255,0.92)"
                    : "rgba(255,255,255,0.1)",
                color:
                  !isCreating && newUserId.length === 4 && username
                    ? "#111"
                    : "rgba(255,255,255,0.3)",
                border: "none",
                borderRadius: 12,
                padding: "13px",
                fontWeight: 600,
                fontSize: 15,
                cursor:
                  !isCreating && newUserId.length === 4 && username
                    ? "pointer"
                    : "not-allowed",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              {isCreating ? "กำลังสร้าง..." : "สร้างบัญชี"}
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
  userId,
  loginError,
  setUserId,
  handleLogin,
}: Props) {
  const [showRegister, setShowRegister] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  if (isLoggedIn) return null;
  if (isLoading) return <CommonLoading />;

  useEffect(() => {
    if (loginError) {
      setUserId("");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
    }
  }, [loginError]);

  return (
    <>
      {/* Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 120,
          paddingBottom: 100,
          fontFamily:
            "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 340,
            height: 340,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            right: "10%",
            width: 200,
            height: 200,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            animation: "fadeDown 0.5s ease",
          }}
        >
          {/* App icon */}
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
              marginBottom: 8,
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
            กรอกรหัสผู้ใช้
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 13,
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            กรอกรหัสผ่าน 4 หลักของคุณ
          </p>
        </div>

        {/* Passcode */}
        <div
          style={{
            animation: shakeError ? "shake 0.5s ease" : "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <IOSPasscode
            value={userId}
            length={4}
            onChange={setUserId}
            onSubmit={handleLogin}
          />

          {/* Error */}
          <div
            className="!text-red-500"
            style={{
              height: 20,
              marginTop: 4,
              transition: "opacity 0.2s",
              opacity: loginError ? 1 : 0,
            }}
          >
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
          </div>
        </div>

        {/* Confirm button + register link */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            width: "100%",
            paddingInline: 40,
          }}
        >
          <button
            onClick={handleLogin}
            disabled={isLoading || userId.length !== 4}
            style={{
              width: "100%",
              maxWidth: 260,
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background:
                !isLoading && userId.length === 4
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.08)",
              color:
                !isLoading && userId.length === 4
                  ? "#0d0d14"
                  : "rgba(255,255,255,0.25)",
              fontWeight: 600,
              fontSize: 16,
              cursor:
                !isLoading && userId.length === 4 ? "pointer" : "not-allowed",
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              transform:
                !isLoading && userId.length === 4 ? "scale(1)" : "scale(0.98)",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
            }}
          >
            {isLoading ? "กำลังโหลด..." : "ยืนยัน"}
          </button>

          {/* Register link */}
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
              letterSpacing: "0.01em",
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

      {/* Register Modal */}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0) }
          20%       { transform: translateX(-8px) }
          40%       { transform: translateX(8px) }
          60%       { transform: translateX(-6px) }
          80%       { transform: translateX(6px) }
        }
      `}</style>
    </>
  );
}
