import { NOTIFICATION_CONFIG } from "@/shared/components/modal/NotificationModal/config.constants";
import { google } from "googleapis";
import webpush from "web-push";
import { getAdvancedLevels } from "../stock/support.function";

webpush.setVapidDetails(
  NOTIFICATION_CONFIG.VAPID_EMAIL,
  NOTIFICATION_CONFIG.VAPID_PUBLIC_KEY,
  NOTIFICATION_CONFIG.VAPID_PRIVATE_KEY,
);

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0]; // "2025-03-12"
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && authHeader !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheets = await getSheets();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:J",
    });

    const rows = res.data.values || [];
    const dataRows = rows.slice(1);
    const todayKey = getTodayKey();

    for (const [rowIdx, row] of dataRows.entries()) {
      const userId = row[0];
      if (
        NOTIFICATION_CONFIG.IS_ADMIN_TEST &&
        userId !== NOTIFICATION_CONFIG.ADMIN_TEST_USER_ID
      ) {
        continue;
      }

      const notifRaw = row[7];       // Column H — notification settings
      const subscriptionRaw = row[8]; // Column I — push subscription
      const notifiedLogRaw = row[9];  // Column J — notified-today log

      if (!notifRaw || !subscriptionRaw) continue;

      const notifSettings = JSON.parse(notifRaw);
      if (!notifSettings.globalEnabled) continue;

      // globalVibrate is a top-level setting saved alongside globalEnabled
      const globalVibrate: boolean = notifSettings.globalVibrate ?? true;

      const subscription = JSON.parse(subscriptionRaw);

      let notifiedToday: Record<string, string[]> = {};
      try {
        notifiedToday = notifiedLogRaw ? JSON.parse(notifiedLogRaw) : {};
      } catch {}
      const alreadyNotifiedSymbols: string[] = notifiedToday[todayKey] || [];

      const newlyNotified: string[] = [...alreadyNotifiedSymbols];
      let didNotify = false;

      for (const setting of notifSettings.notifications) {
        const { symbol, type, targetPrice } = setting;

        if (alreadyNotifiedSymbols.includes(symbol)) continue;

        // getAdvancedLevels ดึง Yahoo 3mo และคำนวณ entry1/entry2 — ใช้ครั้งเดียวได้ทุก type
        const levels = await getAdvancedLevels(symbol);
        const currentPrice = levels.currentPrice;
        if (!currentPrice) continue;

        let shouldNotify = false;
        let message = "";

        if (type === "price") {
          const target = Number(targetPrice);
          if (currentPrice <= target) {
            shouldNotify = true;
            message = `${symbol} ราคาถึงเป้า ${target} แล้ว! ราคาปัจจุบัน ${currentPrice.toFixed(2)}`;
          }
        } else if (type === "support1" || type === "support2") {
          const supportLevel = type === "support1" ? levels.entry1 : levels.entry2;
          const supportLabel = type === "support1" ? "แนวรับ 1" : "แนวรับ 2";

          const threshold =
            supportLevel * (1 + NOTIFICATION_CONFIG.SUPPORT_THRESHOLD_PERCENT / 100);
          if (currentPrice <= threshold) {
            shouldNotify = true;
            message = `${symbol} ใกล้${supportLabel}! ราคาปัจจุบัน ${currentPrice.toFixed(2)} (${supportLabel} ~${supportLevel.toFixed(2)})`;
          }
        }

        if (shouldNotify) {
          try {
            await webpush.sendNotification(
              subscription,
              JSON.stringify({
                title: `📊 แจ้งเตือน ${symbol}`,
                body: message,
                icon: "/apple-icon.png",
                vibrate: globalVibrate, // ← ใช้ค่า global แทน per-stock
              }),
            );
            newlyNotified.push(symbol);
            didNotify = true;
          } catch (err) {
            console.error(`Push failed for ${userId} / ${symbol}:`, err);
          }
        }
      }

      if (didNotify) {
        notifiedToday[todayKey] = newlyNotified;
        const rowNumber = rowIdx + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Sheet1!J${rowNumber}`,
          valueInputOption: "RAW",
          requestBody: { values: [[JSON.stringify(notifiedToday)]] },
        });
      }
    }

    return Response.json({ message: "Check complete", date: todayKey });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}