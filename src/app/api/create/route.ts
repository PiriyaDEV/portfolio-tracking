// app/api/create/route.ts
// Schema:
//   A  = internalId (auto, timestamp)
//   B  = assets (encrypted, filled later)
//   C  = reserved
//   D  = displayName (= username on create, editable later)
//   E  = image
//   F–J = reserved
//   K  = username (index 10) — used for login lookup, duplicate check
//   L  = password encrypted AES-256-CBC (index 11)

import { google } from "googleapis";
import { encrypt } from "@/app/lib/utils";

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

export async function POST(req: Request) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (
      !spreadsheetId ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      return new Response(
        JSON.stringify({ error: "Google Sheets env missing" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const username: string = (body.username ?? "").trim();
    const password: string = body.password ?? "";
    const image: string = body.image ?? "";

    if (!username || !password) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: username and password",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const sheets = await getGoogleSheets();

    // Duplicate check — column K (username, index 10)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!K:K",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1); // skip header

    const isDuplicate = dataRows.some(
      (row) => row[0] && row[0].toString().trim() === username,
    );

    if (isDuplicate) {
      return new Response(
        JSON.stringify({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const internalId = Date.now().toString();

    // Row A–L (12 columns, index 0–11)
    const newRow = [
      internalId, // A  (0)  internal row key
      "", // B  (1)  assets
      "", // C  (2)  reserved
      username, // D  (3)  displayName = username on create
      image, // E  (4)  avatar
      "", // F  (5)
      "", // G  (6)
      "", // H  (7)
      "", // I  (8)
      "", // J  (9)
      username, // K  (10) username — login lookup key
      encrypt(password), // L  (11) password encrypted
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:L",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [newRow] },
    });

    return new Response(
      JSON.stringify({
        message: "User created successfully",
        user: { username, image },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("POST /api/create error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
