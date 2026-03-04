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
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { userId, username, image } = await req.json();

    if (!userId || !username) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId and username" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate userId is exactly 4 digits
    if (!/^\d{4}$/.test(userId)) {
      return new Response(
        JSON.stringify({ error: "รหัสผู้ใช้ต้องเป็นตัวเลข 4 หลัก" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sheets = await getGoogleSheets();

    // Read existing IDs (Column A) to check for duplicates
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:A",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1); // Skip header row

    // Check for duplicate userId
    const isDuplicate = dataRows.some(
      (row) => row[0] && row[0].toString() === userId.toString()
    );

    if (isDuplicate) {
      return new Response(
        JSON.stringify({ error: "รหัสผู้ใช้นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Append new row: [userId, "", "", username, image]
    // Column A = userId/password, D = username, E = image
    // Columns B and C are left empty to match existing schema
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:E",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[userId, "", "", username, image || ""]],
      },
    });

    return new Response(
      JSON.stringify({
        message: "User created successfully",
        user: {
          id: userId,
          username,
          image: image || "",
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("POST /api/user/create Error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}