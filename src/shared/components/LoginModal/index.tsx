"use client";

import React, { useEffect } from "react";
import CommonLoading from "@/shared/components/CommonLoading";

type Props = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string;
  loginError: string | null;
  setUserId: (value: string) => void;
  handleLogin: () => void;
};

// ---------------------------------------------------------
// iPhone Style Passcode Screen
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

    if (v.length === length) {
      setTimeout(() => onSubmit?.(), 150);
    }
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
    <div className="flex flex-col items-center gap-8">
      {/* PASSCODE DOTS */}
      <div className="flex gap-4">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border border-white ${
              value[i] ? "bg-white" : "bg-transparent"
            }`}
          />
        ))}
      </div>

      {/* KEYPAD */}
      <div className="grid grid-cols-3 gap-5 text-white text-2xl">
        {keypad.flat().map((key, i) => {
          if (key === "") return <div key={i}></div>;

          if (key === "⌫")
            return (
              <button
                key={i}
                onClick={removeDigit}
                className="w-20 h-20 rounded-full flex items-center justify-center bg-white/10 active:bg-white/20"
              >
                ⌫
              </button>
            );

          return (
            <button
              key={i}
              onClick={() => addDigit(key)}
              className="w-20 h-20 rounded-full flex items-center justify-center bg-white/10 active:bg-white/20"
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

export default function LoginModal({
  isLoggedIn,
  isLoading,
  userId,
  loginError,
  setUserId,
  handleLogin,
}: Props) {
  if (isLoggedIn) return null;
  if (isLoading) return <CommonLoading />;

  useEffect(() => {
    if (loginError) {
      setUserId("");
    }
  }, [loginError]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="p-8 rounded-xl w-[320px] flex flex-col gap-6 items-center">
        <h2 className="text-white text-xl font-bold text-center">
          กรอกรหัสผู้ใช้
        </h2>

        {/* iPhone Passcode Component */}
        <IOSPasscode value={userId} length={4} onChange={setUserId} />

        {/* ⭐ SUBMIT BUTTON (RESTORED) */}
        <button
          className="bg-accent-yellow text-white p-2 rounded w-full mt-2 font-bold"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "กำลังโหลด..." : "ยืนยัน"}
        </button>

        {/* RED ERROR MESSAGE */}
        {loginError && (
          <p className="!text-red-500 text-sm text-center">*{loginError}</p>
        )}
      </div>
    </div>
  );
}
