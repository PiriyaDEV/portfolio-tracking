// ─── Password Validation Utils ─────────────────────────────────────────────────

export interface PasswordRule {
  label: string;
  test: (p: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "ตัวพิมพ์เล็ก (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "ตัวเลข (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "อักขระพิเศษ (!@#$...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export type StrengthLevel = "weak" | "medium" | "strong";

export interface PasswordStrength {
  passedCount: number;
  level: StrengthLevel | null; // null when empty
  color: string;
  label: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { passedCount: 0, level: null, color: "", label: "" };

  const passedCount = PASSWORD_RULES.filter((r) => r.test(password)).length;

  const level: StrengthLevel =
    passedCount === 0
      ? "weak"
      : passedCount <= 1
        ? "weak"
        : passedCount === 2
          ? "medium"
          : "strong";

  const color =
    level === "weak"
      ? "rgba(255,59,48,0.8)"
      : level === "medium"
        ? "rgba(255,159,10,0.8)"
        : "rgba(52,199,89,0.8)";

  const label =
    level === "weak" ? "อ่อน" : level === "medium" ? "ปานกลาง" : "แข็งแกร่ง";

  return { passedCount, level, color, label };
}

/** Hard requirement: at least 4 chars. Returns error string or null. */
export function validateNewPassword(
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!newPassword) return "กรุณากรอกรหัสผ่านใหม่";
  if (newPassword.length < 4) return "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร";
  if (newPassword !== confirmPassword) return "รหัสผ่านไม่ตรงกัน";
  return null;
}
