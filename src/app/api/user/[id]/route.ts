// app/user/[id]/route.ts
import { google } from "googleapis";
import { encrypt, decrypt } from "@/app/lib/utils";

// Helper function to initialize Google Sheets
async function getGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

export async function GET(req: Request, context: any) {
  try {
    const { id } = await context.params;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (
      !spreadsheetId ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      return new Response(
        JSON.stringify({ error: "Google Sheets env missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const sheets = await getGoogleSheets();

    // Read all rows from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:E", // Adjust sheet name if needed
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Skip header row (index 0) and find the row with matching ID
    const userRow = rows
      .slice(1)
      .find((row) => row[0] && row[0].toString() === id.toString());

    if (!userRow) {
      console.log("Looking for ID:", id);
      console.log(
        "Available IDs:",
        rows.slice(1).map((r) => r[0]),
      );
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Decrypt and parse the JSON data from column B
    let userData = [];
    if (userRow[1]) {
      try {
        const decrypted = decrypt(userRow[1]);
        userData = JSON.parse(decrypted);
      } catch (e) {
        // Fallback: try parsing as plain JSON (for legacy unencrypted rows)
        try {
          userData = JSON.parse(userRow[1]);
        } catch {
          userData = [];
        }
      }
    }

    // Parse the JSON data from column D
    const username = userRow[3] ? userRow[3] : "";
    const image = userRow[4] ? userRow[4] : "";

    return new Response(
      JSON.stringify({
        userId: id,
        username: username,
        assets: userData,
        image: image,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("GET Error details:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
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

export async function POST(req: Request, context: any) {
  try {
    const { id } = await context.params;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (
      !spreadsheetId ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      return new Response(
        JSON.stringify({ error: "Google Sheets env missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const { assets } = await req.json();
    if (!assets || !Array.isArray(assets)) {
      return new Response(JSON.stringify({ error: "Invalid assets data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Sort assets by total value (costPerShare * quantity) descending
    const sortedAssets = [...assets].sort(
      (a, b) => b.costPerShare * b.quantity - a.costPerShare * a.quantity,
    );

    // Encrypt assets before saving to sheet
    const encryptedAssets = encrypt(JSON.stringify(sortedAssets));

    const sheets = await getGoogleSheets();

    // Read all rows to find the user
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:B",
    });

    const rows = response.data.values || [];
    // Skip header row when searching (slice(1)), but remember actual position
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex(
      (row) => row[0] && row[0].toString() === id.toString(),
    );

    if (userRowIndex === -1) {
      // User doesn't exist, create new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:B",
        valueInputOption: "RAW",
        requestBody: {
          values: [[id, encryptedAssets]],
        },
      });
    } else {
      // Update existing row (+2 because: +1 for header, +1 for 1-indexed sheets)
      const actualRowNumber = userRowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!B${actualRowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[encryptedAssets]],
        },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Updated",
        user: { id, data: sortedAssets },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("POST Error details:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
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
