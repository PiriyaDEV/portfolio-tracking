// app/api/user/[id]/route.ts
// [id] = column A internal key (set at create time, stored in session).
//
// GET  — fetch user profile + assets (session-authenticated, no password needed)
// POST — save/update encrypted assets

import { google } from "googleapis";
import { encrypt, decrypt } from "@/app/lib/utils";

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

const ENV_ERROR = new Response(
  JSON.stringify({ error: "Google Sheets env missing" }),
  { status: 400, headers: { "Content-Type": "application/json" } },
);

// ---------------------------------------------------------------------------
// GET /api/user/[id]  — fetch profile + assets by column A internal key
// ---------------------------------------------------------------------------
export async function GET(req: Request, context: any) {
  if (missingEnv()) return ENV_ERROR;

  try {
    const params = await context.params;
    const id: string = params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing user id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheets = getGoogleSheets();

    // Fetch columns A–L (indices 0–11)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:L",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return new Response(JSON.stringify({ error: "ไม่เจอผู้ใช้งาน" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Match by column A (index 0) = internal id
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex(
      (row) => row[0] && row[0].toString() === id,
    );

    if (userRowIndex === -1) {
      return new Response(JSON.stringify({ error: "ไม่เจอผู้ใช้งาน" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userRow = dataRows[userRowIndex];

    // Parse assets — column B (index 1)
    let assets = [];
    if (userRow[1]) {
      try {
        assets = JSON.parse(decrypt(userRow[1]));
      } catch {
        try {
          assets = JSON.parse(userRow[1]);
        } catch {
          assets = [];
        }
      }
    }

    return new Response(
      JSON.stringify({
        userId: userRow[0] ?? "", // column A — internal key
        username: userRow[10] ?? "", // column K — username (login id)
        displayName: userRow[3] ?? "", // column D — display name
        assets,
        image: userRow[4] ?? "", // column E
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("GET /api/user/[id] error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message ?? "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/user/[id]  — save/update encrypted assets
// ---------------------------------------------------------------------------
export async function POST(req: Request, context: any) {
  if (missingEnv()) return ENV_ERROR;

  try {
    const params = await context.params;
    const id: string = params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing user id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    const { assets } = await req.json();
    if (!assets || !Array.isArray(assets)) {
      return new Response(JSON.stringify({ error: "Invalid assets data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sortedAssets = assets.sort(
      (a, b) => b.costPerShare * b.quantity - a.costPerShare * a.quantity,
    );

    const encryptedAssets = encrypt(JSON.stringify(sortedAssets));
    const sheets = getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:B",
    });

    const rows = response.data.values || [];
    const userRowIndex = rows
      .slice(1)
      .findIndex((row) => row[0] && row[0].toString() === id);

    if (userRowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:B",
        valueInputOption: "RAW",
        requestBody: { values: [[id, encryptedAssets]] },
      });
    } else {
      const actualRowNumber = userRowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!B${actualRowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [[encryptedAssets]] },
      });
    }

    return new Response(
      JSON.stringify({ message: "Updated", user: { id, data: sortedAssets } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("POST /api/user/[id] error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message ?? "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
