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
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { oldPassword, newPassword, username, image } = await req.json();

    if (!oldPassword || !newPassword || !username) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const sheets = await getGoogleSheets();

    // ✅ Read only Column A (ID / Password)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:A",
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1); // Skip header row

    // 🔎 Find current user row
    const userRowIndex = dataRows.findIndex(
      (row) => row[0] && row[0].toString() === oldPassword.toString(),
    );

    if (userRowIndex === -1) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🔐 Check duplicate new password (exclude current row)
    const isDuplicate = dataRows.some((row, index) => {
      if (index === userRowIndex) return false;
      return row[0] && row[0].toString() === newPassword.toString();
    });

    if (isDuplicate) {
      return new Response(
        JSON.stringify({ error: "ข้อมูลซ้ำโปรดกรอกรหัสอื่น" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const actualRowNumber = userRowIndex + 2; // +1 header, +1 index offset

    // ✅ Update Column A (ID / Password)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${actualRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[newPassword]],
      },
    });

    // ✅ Update Column D (Username)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!D${actualRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[username]],
      },
    });

    // ✅ Update Column E (Image)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!E${actualRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[image || ""]],
      },
    });

    return new Response(
      JSON.stringify({
        message: "User updated successfully (assets preserved)",
        user: {
          id: newPassword,
          username,
          image,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("POST Error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error?.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
