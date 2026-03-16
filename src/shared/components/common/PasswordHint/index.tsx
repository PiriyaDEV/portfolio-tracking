import { getPasswordStrength, PASSWORD_RULES } from "@/app/lib/password.utils";
import React from "react";

/**
 * Informational strength bar only — does NOT block form submission.
 * Hard requirement (≥4 chars) is enforced in validateNewPassword instead.
 */
export function PasswordStrengthHint({ password }: { password: string }) {
  if (!password) return null;

  const { passedCount, color, label } = getPasswordStrength(password);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}
    >
      {/* Bar + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < passedCount ? color : "rgba(255,255,255,0.1)",
              transition: "background 0.2s",
            }}
          />
        ))}
        <span
          style={{
            color,
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: "nowrap",
            marginLeft: 4,
          }}
        >
          {label}
        </span>
      </div>

      {/* Checklist — informational only */}
      {/* <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {PASSWORD_RULES.map((rule, i) => {
          const passed = rule.test(password);
          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <span
                style={{
                  fontSize: 10,
                  lineHeight: 1,
                  color: passed
                    ? "rgba(52,199,89,0.9)"
                    : "rgba(255,255,255,0.25)",
                }}
              >
                {passed ? "✓" : "○"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: passed
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.25)",
                }}
              >
                {rule.label}
              </span>
            </div>
          );
        })}
      </div> */}
    </div>
  );
}
