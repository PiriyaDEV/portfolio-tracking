import { google } from "googleapis";

async function getGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

/* ---------------- GET ---------------- */
export async function GET(req: Request, context: any) {
  try {
    const { id } = await context.params;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const url = new URL(req.url);
    const symbolsParam = url.searchParams.get("symbols");
    const validSymbols = symbolsParam
      ? new Set(
          symbolsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : null;

    if (!spreadsheetId) {
      return Response.json(
        { error: "Google Sheets env missing" },
        { status: 400 },
      );
    }

    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:J",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex(
      (row) => row[0]?.toString() === id.toString(),
    );

    if (userRowIndex === -1) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userRow = dataRows[userRowIndex];
    const raw = userRow[7];
    let notification = raw
      ? JSON.parse(raw)
      : { globalEnabled: false, notifications: [] };

    // ── Clean up invalid symbols from Column H ──────────────────────────
    if (validSymbols && notification.notifications?.length) {
      const before = notification.notifications.length;
      notification.notifications = notification.notifications.filter(
        (n: { symbol: string }) => validSymbols.has(n.symbol),
      );
      const after = notification.notifications.length;

      // Only write back if something was actually removed
      if (before !== after) {
        const rowNumber = userRowIndex + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Sheet1!H${rowNumber}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[JSON.stringify(notification)]],
          },
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────

    const hasSubscription = !!userRow[8];

    const today = new Date().toISOString().split("T")[0];
    let notifiedToday: string[] = [];
    try {
      const notifLog = userRow[9] ? JSON.parse(userRow[9]) : {};
      notifiedToday = notifLog[today] ?? [];
    } catch {
      notifiedToday = [];
    }

    return Response.json({
      userId: id,
      notification,
      hasSubscription,
      notifiedToday,
    });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/* ---------------- POST ---------------- */
export async function POST(req: Request, context: any) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { globalEnabled, notifications } = body;

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (typeof globalEnabled !== "boolean" || !Array.isArray(notifications)) {
      return Response.json(
        { error: "Invalid notification payload" },
        { status: 400 },
      );
    }

    const sheets = await getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:H",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex((r) => r[0]?.toString() === id);

    const payload = JSON.stringify({
      globalEnabled,
      notifications,
    });

    if (userRowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:H",
        valueInputOption: "RAW",
        requestBody: {
          values: [[id, "", "", "", "", "", "", payload]],
        },
      });
    } else {
      const rowNumber = userRowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!H${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[payload]],
        },
      });
    }

    return Response.json({
      message: "Notification settings saved",
      userId: id,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
