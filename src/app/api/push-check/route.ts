// /push-check
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
  return new Date().toISOString().split("T")[0];
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

      const notifRaw = row[7]; // Column H — notification settings
      const subscriptionRaw = row[8]; // Column I — push subscription
      const notifiedLogRaw = row[9]; // Column J — notified log

      if (!notifRaw || !subscriptionRaw) continue;

      const notifSettings = JSON.parse(notifRaw);
      if (!notifSettings.globalEnabled) continue;

      const subscription = JSON.parse(subscriptionRaw);

      // Structure: Record<todayKey, Record<"SYMBOL_type", reachedLevel (1|2|3)>>
      let notifiedLevels: Record<string, Record<string, number>> = {};
      try {
        notifiedLevels = notifiedLogRaw ? JSON.parse(notifiedLogRaw) : {};
      } catch {}
      const todayLevels: Record<string, number> =
        notifiedLevels[todayKey] || {};

      let didNotify = false;
      const newTodayLevels = { ...todayLevels };

      for (const setting of notifSettings.notifications) {
        const { symbol, type, targetPrice } = setting;
        const settingKey = `${symbol}_${type}`; // e.g. "PTT_support1", "PTT_price"

        const levels = await getAdvancedLevels(symbol);
        const currentPrice = levels.currentPrice;
        if (!currentPrice) continue;

        // Resolve level1 threshold from the user's chosen type
        let level1: number | null = null;
        let baseEmoji = "🎯";
        let baseLabel = "";

        if (type === "price") {
          level1 = Number(targetPrice);
          baseEmoji = "🎯";
          baseLabel = `ราคาเป้า ${level1.toFixed(2)}`;
        } else if (type === "support1") {
          level1 = levels.entry1;
          baseEmoji = "📉";
          baseLabel = `แนวรับ 1 (${level1.toFixed(2)})`;
        } else if (type === "support2") {
          level1 = levels.entry2;
          baseEmoji = "📉";
          baseLabel = `แนวรับ 2 (${level1.toFixed(2)})`;
        }

        if (!level1) continue;

        const CONFIG = {
          level2: 0.5,
          level3: 0.75,
        };

        const level2 = level1 * (1 - CONFIG.level2 / 100);
        const level3 = level1 * (1 - CONFIG.level3 / 100);

        // Determine the deepest level reached right now
        let reachedLevel = 0;
        if (currentPrice <= level3) reachedLevel = 3;
        else if (currentPrice <= level2) reachedLevel = 2;
        else if (currentPrice <= level1) reachedLevel = 1;

        if (reachedLevel === 0) continue;

        const lastNotifiedLevel = todayLevels[settingKey] || 0;

        // Only notify if we've gone DEEPER than last notified level today.
        // This naturally handles the "skip" case:
        //   - First cron: price at level3 → lastNotified=0, reachedLevel=3 → notify level3 only
        //   - Next cron: still level3 → 3 <= 3 → skip ✓
        //   - If price recovers then drops to level2 next day → new todayKey → lastNotified=0 → notify level2
        if (reachedLevel <= lastNotifiedLevel) continue;

        const levelLabels: Record<number, string> = {
          1: `⚠️ Level 1`,
          2: `🔴 Level 2 (-2.5%)`,
          3: `🚨 Level 3 (-5%)`,
        };

        const message =
          `${symbol} ต่ำกว่า ${baseLabel} — ${levelLabels[reachedLevel]}\n` +
          `ราคาปัจจุบัน ${currentPrice.toFixed(2)} | ` +
          `L1: ${level1.toFixed(2)} | L2: ${level2.toFixed(2)} | L3: ${level3.toFixed(2)}`;

        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `${baseEmoji} ${symbol} — ${levelLabels[reachedLevel]}`,
              body: message,
              icon: "/apple-icon.png",
            }),
          );
          newTodayLevels[settingKey] = reachedLevel;
          didNotify = true;
        } catch (err) {
          console.error(`Push failed for ${userId} / ${symbol}:`, err);
        }
      }

      if (didNotify) {
        notifiedLevels[todayKey] = newTodayLevels;
        const rowNumber = rowIdx + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Sheet1!J${rowNumber}`,
          valueInputOption: "RAW",
          requestBody: { values: [[JSON.stringify(notifiedLevels)]] },
        });
      }
    }

    return Response.json({ message: "Check complete", date: todayKey });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
