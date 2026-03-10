// app/user/[id]/route.ts
import { google } from "googleapis";
import { encrypt, decrypt } from "@/app/lib/utils";

// Module-level singleton: reuse auth + sheets client across requests
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

export async function GET(req: Request, context: any) {
  if (missingEnv()) return ENV_ERROR;

  try {
    const { id } = await context.params;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheets = getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:E",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Skip header (index 0), find matching row in one pass
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex(
      (row) => row[0] && row[0].toString() === id.toString(),
    );

    if (userRowIndex === -1) {
      console.log("Looking for ID:", id);
      console.log(
        "Available IDs:",
        dataRows.map((r) => r[0]),
      );
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userRow = dataRows[userRowIndex];

    let userData = [];
    if (userRow[1]) {
      try {
        userData = JSON.parse(decrypt(userRow[1]));
      } catch {
        try {
          userData = JSON.parse(userRow[1]);
        } catch {
          userData = [];
        }
      }
    }

    return new Response(
      JSON.stringify({
        userId: id,
        username: userRow[3] ?? "",
        assets: userData,
        image: userRow[4] ?? "",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("GET Error details:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message ?? "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function POST(req: Request, context: any) {
  if (missingEnv()) return ENV_ERROR;

  try {
    const { id } = await context.params;
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
      .findIndex((row) => row[0] && row[0].toString() === id.toString());

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
    console.error("POST Error details:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message ?? "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
