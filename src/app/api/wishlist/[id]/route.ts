// app/wishlist/[id]/route.ts
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
        { status: 400 }
      );
    }

    const sheets = await getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C",
    });

    const rows = response.data.values || [];
    const userRow = rows
      .slice(1)
      .find((row) => row[0] && row[0].toString() === id.toString());

    if (!userRow) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Column C only
    const wishlist = userRow[2] ? JSON.parse(userRow[2]) : [];

    return Response.json({ userId: id, assets: wishlist });
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
    const assets = body.wishlist;

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!Array.isArray(assets)) {
      return Response.json({ error: "Invalid wishlist" }, { status: 400 });
    }

    const sheets = await getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);

    const userRowIndex = dataRows.findIndex((r) => r[0]?.toString() === id);

    if (userRowIndex === -1) {
      // New user
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:C",
        valueInputOption: "RAW",
        requestBody: {
          values: [[id, "", JSON.stringify(assets)]],
        },
      });
    } else {
      const rowNumber = userRowIndex + 2;

      // Update wishlist column only
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!C${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[JSON.stringify(assets)]],
        },
      });
    }

    return Response.json({ message: "Wishlist updated", userId: id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
