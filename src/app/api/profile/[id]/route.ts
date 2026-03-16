// app/api/profile/[id]/route.ts
// [id] = column A internal key
// POST { displayName, newUsername, oldPassword, newPassword?, image }
// Updates: D=displayName, E=image, K=username, L=newPassword(encrypted)
// Verifies oldPassword against column L before updating

import { google } from "googleapis";
import { encrypt, decrypt } from "@/app/lib/utils";

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

export async function POST(req: Request, context: any) {
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

    const params = await context.params;
    const id: string = params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing user id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Added newUsername to destructure ──
    const { displayName, newUsername, oldPassword, newPassword, image } =
      await req.json();

    if (!displayName || !oldPassword) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: displayName and oldPassword",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const sheets = await getGoogleSheets();

    // Fetch columns A–L (indices 0–11)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:L",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1); // skip header

    // Find row by column A (internal key, index 0)
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

    // Verify old password against column L (index 11)
    const storedEncrypted = userRow[11] ?? "";
    let storedPassword = "";
    if (storedEncrypted) {
      try {
        storedPassword = decrypt(storedEncrypted);
      } catch {
        storedPassword = storedEncrypted; // legacy plain-text fallback
      }
    }

    if (storedPassword !== oldPassword) {
      return new Response(JSON.stringify({ error: "รหัสผ่านเดิมไม่ถูกต้อง" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const actualRow = userRowIndex + 2; // +1 header, +1 for 1-based

    // Update column D (displayName, index 3)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!D${actualRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[displayName.trim()]] },
    });

    // Update column E (image, index 4)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!E${actualRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[image ?? ""]] },
    });

    // ── Update column K (username, index 10) if newUsername provided ──
    if (newUsername && newUsername.trim() !== "") {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!K${actualRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [[newUsername.trim()]] },
      });
    }

    // Update column L (password) only if newPassword is provided
    if (newPassword && newPassword.trim() !== "") {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!L${actualRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [[encrypt(newPassword)]] },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Profile updated successfully",
        user: {
          id,
          displayName: displayName.trim(),
          username: newUsername?.trim() ?? userRow[10], // col K index 10
          image: image ?? "",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("POST /api/profile/[id] error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
