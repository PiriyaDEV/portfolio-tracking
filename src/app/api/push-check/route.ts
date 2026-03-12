import { NOTIFICATION_CONFIG } from "@/shared/components/modal/NotificationModal/config.constants";
import { google } from "googleapis";
import webpush from "web-push";

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

async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${NOTIFICATION_CONFIG.YAHOO_API_BASE}/${symbol}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

// Simple support level = 52-week low from Yahoo
async function fetchSupportLevel(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${NOTIFICATION_CONFIG.YAHOO_API_BASE}/${symbol}?interval=1wk&range=1y`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    const json = await res.json();
    const lows: number[] =
      json?.chart?.result?.[0]?.indicators?.quote?.[0]?.low ?? [];
    const filtered = lows.filter((v) => v != null && v > 0);
    return filtered.length ? Math.min(...filtered) : null;
  } catch {
    return null;
  }
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0]; // "2025-03-12"
}

export async function GET(req: Request) {
  // Optional: protect with a secret header for cron
  const authHeader = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && authHeader !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheets = await getSheets();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:J", // A=id, H=notif settings, I=push subscription, J=notified-today log
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
      const notifRaw = row[7]; // Column H
      const subscriptionRaw = row[8]; // Column I
      const notifiedLogRaw = row[9]; // Column J

      if (!notifRaw || !subscriptionRaw) continue;

      const notifSettings = JSON.parse(notifRaw);
      if (!notifSettings.globalEnabled) continue;

      const subscription = JSON.parse(subscriptionRaw);

      // Parse today's already-notified symbols
      let notifiedToday: Record<string, string[]> = {};
      try {
        notifiedToday = notifiedLogRaw ? JSON.parse(notifiedLogRaw) : {};
      } catch {}
      const alreadyNotifiedSymbols: string[] = notifiedToday[todayKey] || [];

      const newlyNotified: string[] = [...alreadyNotifiedSymbols];
      let didNotify = false;

      for (const setting of notifSettings.notifications) {
        const { symbol, type, targetPrice } = setting;

        // Skip if already notified today
        if (alreadyNotifiedSymbols.includes(symbol)) continue;

        const currentPrice = await fetchPrice(symbol);
        if (!currentPrice) continue;

        let shouldNotify = false;
        let message = "";

        if (type === "price") {
          const target = Number(targetPrice);
          if (currentPrice <= target) {
            shouldNotify = true;
            message = `${symbol} ราคาถึงเป้า ${target} แล้ว! ราคาปัจจุบัน ${currentPrice.toFixed(2)}`;
          }
        } else if (type === "support") {
          const support = await fetchSupportLevel(symbol);
          if (support) {
            const threshold =
              support *
              (1 + NOTIFICATION_CONFIG.SUPPORT_THRESHOLD_PERCENT / 100);
            if (currentPrice <= threshold) {
              shouldNotify = true;
              message = `${symbol} ใกล้แนวรับ! ราคาปัจจุบัน ${currentPrice.toFixed(2)} (แนวรับ ~${support.toFixed(2)})`;
            }
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
              }),
            );
            newlyNotified.push(symbol);
            didNotify = true;
          } catch (err) {
            console.error(`Push failed for ${userId} / ${symbol}:`, err);
          }
        }
      }

      // Save updated notified-today log back to column J
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
