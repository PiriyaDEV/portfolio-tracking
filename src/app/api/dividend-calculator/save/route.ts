// app/api/dividend-calculator/save/route.ts
// GET  ?userId=xxx        → returns saved entries from column N
// POST { userId, entries } → writes entries JSON to column N

import { google } from "googleapis";

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getGoogleSheets() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

function missingEnv() {
  return (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  );
}

// ─── Find row index by userId (column A) ─────────────────────────────────────

async function findUserSheetRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  userId: string,
): Promise<number | null> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:A",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return null;

  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex(
    (row) => row[0] && row[0].toString().trim() === userId,
  );

  if (rowIndex === -1) return null;

  // Sheet row number = rowIndex + 2 (1-indexed + skip header)
  return rowIndex + 2;
}

// ─── GET /api/dividend-calculator/save?userId=xxx ────────────────────────────

export async function GET(req: Request) {
  if (missingEnv()) {
    return new Response(
      JSON.stringify({ error: "Google Sheets env missing" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get("userId") ?? "").trim();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheets = getGoogleSheets();

    const sheetRow = await findUserSheetRow(sheets, spreadsheetId, userId);
    if (!sheetRow) {
      return new Response(JSON.stringify({ entries: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Read column N of that row
    const cellRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Sheet1!N${sheetRow}`,
    });

    const raw = cellRes.data.values?.[0]?.[0] ?? "";

    let entries = [];
    if (raw) {
      try {
        entries = JSON.parse(raw);
      } catch {
        entries = [];
      }
    }

    return new Response(JSON.stringify({ entries }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("GET /api/dividend-calculator/save error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ─── POST /api/dividend-calculator/save ──────────────────────────────────────

export async function POST(req: Request) {
  if (missingEnv()) {
    return new Response(
      JSON.stringify({ error: "Google Sheets env missing" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const userId: string = (body.userId ?? "").trim();
    const entries = body.entries;

    if (!userId || !Array.isArray(entries) || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "userId and entries are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheets = getGoogleSheets();

    const sheetRow = await findUserSheetRow(sheets, spreadsheetId, userId);
    if (!sheetRow) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!N${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[JSON.stringify(entries)]],
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("POST /api/dividend-calculator/save error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
