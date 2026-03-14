// app/api/login/route.ts
// POST { username, password }
// Schema:
//   D  = displayName (index 3)
//   K  = username    (index 10) — login lookup
//   L  = password encrypted (index 11)

import { google } from "googleapis";
import { decrypt } from "@/app/lib/utils";

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

export async function POST(req: Request) {
  if (missingEnv()) {
    return new Response(
      JSON.stringify({ error: "Google Sheets env missing" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = await req.json();
    const username: string = (body.username ?? "").trim();
    const password: string = body.password ?? "";

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Skip header, match by column K (index 10) = username
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex(
      (row) => row[10] && row[10].toString().trim() === username,
    );

    if (userRowIndex === -1) {
      return new Response(
        JSON.stringify({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const userRow = dataRows[userRowIndex];

    // Validate password — column L (index 11), stored encrypted
    const storedEncrypted = userRow[11] ?? "";
    if (!storedEncrypted) {
      return new Response(
        JSON.stringify({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    let storedPassword: string;
    try {
      storedPassword = decrypt(storedEncrypted);
    } catch {
      // Fallback: legacy plain-text (migration safety)
      storedPassword = storedEncrypted;
    }

    if (storedPassword !== password) {
      return new Response(
        JSON.stringify({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

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
        userId: userRow[0] ?? "", // column A — internal key for asset updates
        username: userRow[10] ?? "", // column K — username
        displayName: userRow[3] ?? "", // column D — display name
        assets,
        image: userRow[4] ?? "", // column E
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("POST /api/login error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message ?? "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
