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

    if (!spreadsheetId) {
      return Response.json(
        { error: "Google Sheets env missing" },
        { status: 400 },
      );
    }

    const sheets = await getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:H",
    });

    const rows = response.data.values || [];
    const userRow = rows
      .slice(1)
      .find((row) => row[0]?.toString() === id.toString());

    if (!userRow) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Column H = index 7
    const raw = userRow[7];
    const notification = raw
      ? JSON.parse(raw)
      : { globalEnabled: false, notifications: [] };

    return Response.json({ userId: id, notification });
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

    const payload = JSON.stringify({ globalEnabled, notifications });

    if (userRowIndex === -1) {
      // New user row — fill A, leave B-G empty, set H
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
      // Update column H only
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
