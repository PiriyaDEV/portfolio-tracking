import { google } from "googleapis";

async function getSheets() {
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
    const { id } = await context.params;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheets = await getSheets();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:J",
    });

    const rows = res.data.values || [];
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex((r) => r[0]?.toString() === id);

    if (userRowIndex === -1) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const rowNumber = userRowIndex + 2;

    // Clear column J (notified-today log)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!J${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[""]] },
    });

    return Response.json({ message: "Reset successful" });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
