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

      // Guard: skip rows with missing or whitespace-only values
      if (!notifRaw?.trim() || !subscriptionRaw?.trim()) continue;

      // FIX 1: Wrap notifSettings parse in try/catch
      let notifSettings: any;
      try {
        notifSettings = JSON.parse(notifRaw);
      } catch {
        console.warn(
          `[push-check] Invalid notifRaw JSON for row ${rowIdx + 2}, skipping`,
        );
        continue;
      }

      if (!notifSettings?.globalEnabled) continue;

      // FIX 2: Guard notifications is a non-empty array
      if (
        !Array.isArray(notifSettings.notifications) ||
        notifSettings.notifications.length === 0
      ) {
        console.warn(
          `[push-check] No notifications array for row ${rowIdx + 2}, skipping`,
        );
        continue;
      }

      // FIX 3: Wrap subscription parse in try/catch
      let subscription: any;
      try {
        subscription = JSON.parse(subscriptionRaw);
      } catch {
        console.warn(
          `[push-check] Invalid subscriptionRaw JSON for row ${rowIdx + 2}, skipping`,
        );
        continue;
      }

      // Structure: Record<todayKey, Record<"SYMBOL_type", reachedLevel (1|2|3)>>
      let notifiedLevels: Record<string, Record<string, number>> = {};
      try {
        notifiedLevels = notifiedLogRaw?.trim()
          ? JSON.parse(notifiedLogRaw)
          : {};
      } catch {
        console.warn(
          `[push-check] Invalid notifiedLogRaw JSON for row ${rowIdx + 2}, resetting`,
        );
        notifiedLevels = {};
      }

      // 2. Remove old date entries — keep only today's key
      const hasOldEntries = Object.keys(notifiedLevels).some(
        (key) => key !== todayKey,
      );
      if (hasOldEntries) {
        notifiedLevels = notifiedLevels[todayKey]
          ? { [todayKey]: notifiedLevels[todayKey] }
          : {};
      }

      const todayLevels: Record<string, number> =
        notifiedLevels[todayKey] || {};

      let didNotify = false;
      let didCleanup = hasOldEntries;
      const newTodayLevels = { ...todayLevels };

      for (const setting of notifSettings.notifications) {
        const { symbol, type, targetPrice } = setting;

        // Guard: skip malformed setting entries
        if (!symbol || !type) continue;

        const settingKey = `${symbol}_${type}`; // e.g. "PTT_support1", "PTT_price"

        // FIX 4: Wrap getAdvancedLevels in try/catch so one bad symbol
        // doesn't crash the entire loop and return 500
        let levels;
        try {
          levels = await getAdvancedLevels(symbol);
        } catch (err) {
          console.error(
            `[push-check] getAdvancedLevels failed for ${symbol}:`,
            err,
          );
          continue;
        }

        const currentPrice = levels.currentPrice;
        const previousClose = levels.previousClose;
        if (!currentPrice) continue;

        // Resolve level1 threshold from the user's chosen type
        let level1: number | null = null;
        let baseLabel = "";

        if (type === "price") {
          level1 = Number(targetPrice);
          baseLabel = `ราคาเป้า ${level1.toFixed(2)}`;
        } else if (type === "support1") {
          level1 = levels.entry1;
          baseLabel = `แนวรับ 1 (${level1.toFixed(2)})`;
        } else if (type === "support2") {
          level1 = levels.entry2;
          baseLabel = `แนวรับ 2 (${level1.toFixed(2)})`;
        }

        if (!level1) continue;

        const CONFIG = {
          level2: 2.5,
          level3: 5,
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
        if (reachedLevel <= lastNotifiedLevel) continue;

        const levelEmojis: Record<number, string> = {
          1: `👀`,
          2: `⚠️`,
          3: `🚨`,
        };

        const levelLabels: Record<number, string> = {
          1: `แตะจุดน่าสนใจ`,
          2: `ร่วงแรง`,
          3: `ร่วงเกินคาด!`,
        };

        const dailyChangePct = previousClose
          ? ((currentPrice - previousClose) / previousClose) * 100
          : 0;
        const pctSign = dailyChangePct >= 0 ? "+" : "";
        const pctStr = `${pctSign}${dailyChangePct.toFixed(2)}%`;

        const message =
          `${symbol} ต่ำกว่า ${baseLabel} — ` +
          `ราคาปัจจุบัน ${currentPrice.toFixed(2)}`;

        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `${levelEmojis[reachedLevel]} ${symbol} (${pctStr}) — ${levelLabels[reachedLevel]}`,
              body: message,
              icon: "/apple-icon.png",
            }),
          );
          newTodayLevels[settingKey] = reachedLevel;
          didNotify = true;
        } catch (err) {
          console.error(
            `[push-check] Push failed for ${userId} / ${symbol}:`,
            err,
          );
        }
      }

      // Write back if we sent a notification OR cleaned up old date entries
      if (didNotify || didCleanup) {
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
    console.error("[push-check] Unhandled error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
