export const NOTIFICATION_CONFIG = {
  CHECK_INTERVAL_MS: 5 * 60 * 1000,
  RESET_HOUR: 0,
  YAHOO_API_BASE: "https://query1.finance.yahoo.com/v8/finance/chart",
  SUPPORT_THRESHOLD_PERCENT: 2,
  VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  VAPID_EMAIL: process.env.VAPID_EMAIL || "mailto:admin@example.com",

  // ─── Admin test mode ───────────────────────────────────────────
  // เปิด true เพื่อทดสอบ → จะส่ง notification เฉพาะ user นี้เท่านั้น
  IS_ADMIN_TEST: true,
  ADMIN_TEST_USER_ID: "1449",
};
