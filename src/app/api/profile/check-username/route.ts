// app/api/profile/check-username/route.ts
// GET ?username=xxx
// Returns { available: boolean }
// Checks column K (index 10) in Sheet1 for duplicates

import { google } from "googleapis";

async function getGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return new Response(JSON.stringify({ error: "Missing username" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: "Google Sheets env missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const sheets = await getGoogleSheets();

    // Fetch only column K (index 10)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!K:K",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1); // skip header

    const taken = dataRows.some(
      (row) =>
        row[0] &&
        row[0].toString().trim().toLowerCase() === username.toLowerCase(),
    );

    return new Response(JSON.stringify({ available: !taken }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("GET /api/profile/check-username error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
