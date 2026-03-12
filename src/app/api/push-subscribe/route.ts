// /push-subscribe
import { NOTIFICATION_CONFIG } from "@/shared/components/modal/NotificationModal/config.constants";
import { google } from "googleapis";
import webpush from "web-push";

webpush.setVapidDetails(
  NOTIFICATION_CONFIG.VAPID_EMAIL,
  NOTIFICATION_CONFIG.VAPID_PUBLIC_KEY,
  NOTIFICATION_CONFIG.VAPID_PRIVATE_KEY,
);

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userColId, subscription } = body;

    if (!userColId || !subscription) {
      return Response.json(
        { error: "Missing userColId or subscription" },
        { status: 400 },
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheets = await getSheets();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = res.data.values || [];
    const dataRows = rows.slice(1);
    const userRowIndex = dataRows.findIndex(
      (r) => r[0]?.toString() === userColId.toString(),
    );

    if (userRowIndex === -1) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const rowNumber = userRowIndex + 2;

    // Save subscription ลง Column I
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!I${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[JSON.stringify(subscription)]] },
    });

    return Response.json({ message: "Subscription saved" });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
