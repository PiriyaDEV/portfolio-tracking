// // app/api/migrate/route.ts
// // ONE-TIME migration for legacy users.
// //
// // Legacy schema:  A = userId/password (e.g. "1234"), D = displayName, E = image
// // New schema:     A = internalId (timestamp), D = displayName (kept),
// //                 E = image (kept), K = username (= old A), L = encrypt(password) (= old A)
// //
// // POST {} — no body needed, migrates ALL rows that are missing column K
// // Returns a summary of what was changed.
// //
// // ⚠️  Call this ONCE from a secure admin context, then remove or gate behind a secret.

// import { google } from "googleapis";
// import { encrypt } from "@/app/lib/utils";

// async function getGoogleSheets() {
//   const auth = new google.auth.GoogleAuth({
//     credentials: {
//       client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
//       private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//     },
//     scopes: ["https://www.googleapis.com/auth/spreadsheets"],
//   });
//   return google.sheets({ version: "v4", auth });
// }

// export async function POST(req: Request) {
//   // Optional: gate behind a secret header so nobody else can call this
//   // const secret = req.headers.get("x-migrate-secret");
//   // if (process.env.MIGRATE_SECRET && secret !== process.env.MIGRATE_SECRET) {
//   //   return new Response(JSON.stringify({ error: "Unauthorized" }), {
//   //     status: 401,
//   //     headers: { "Content-Type": "application/json" },
//   //   });
//   // }

//   const spreadsheetId = process.env.GOOGLE_SHEET_ID;
//   if (
//     !spreadsheetId ||
//     !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
//     !process.env.GOOGLE_PRIVATE_KEY
//   ) {
//     return new Response(
//       JSON.stringify({ error: "Google Sheets env missing" }),
//       {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       },
//     );
//   }

//   try {
//     const sheets = await getGoogleSheets();

//     // Read full A:L range
//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId,
//       range: "Sheet1!A:L",
//     });

//     const rows = response.data.values || [];
//     if (rows.length <= 1) {
//       return new Response(
//         JSON.stringify({ message: "No data rows found", migrated: 0 }),
//         { status: 200, headers: { "Content-Type": "application/json" } },
//       );
//     }

//     const dataRows = rows.slice(1); // skip header
//     const migrated: string[] = [];
//     const skipped: string[] = [];

//     // Batch all updates into one batchUpdate call
//     const batchData: { range: string; values: string[][] }[] = [];

//     for (let i = 0; i < dataRows.length; i++) {
//       const row = dataRows[i];
//       while (row.length < 12) row.push("");

//       const colA = row[0]?.toString().trim() ?? ""; // old userId / password
//       const colD = row[3]?.toString().trim() ?? ""; // existing displayName
//       const colK = row[10]?.toString().trim() ?? ""; // username (new)
//       const colL = row[11]?.toString().trim() ?? ""; // password encrypted (new)

//       // Already migrated — column K is populated
//       const alreadyMigrated = colK !== "" && colK.length > 0;
//       if (alreadyMigrated) {
//         skipped.push(colA);
//         continue;
//       }

//       if (!colA) {
//         skipped.push(`(empty row ${i + 2})`);
//         continue;
//       }

//       const sheetRow = i + 2; // +1 header, +1 one-based

//       // Generate a new unique internal ID for column A
//       // Use timestamp + row index to ensure uniqueness even in bulk
//       const newInternalId = (Date.now() + i).toString();

//       // displayName: keep existing col D if set, otherwise use old id
//       const displayName = colD !== "" ? colD : colA;

//       batchData.push(
//         // A: new internal id
//         { range: `Sheet1!A${sheetRow}`, values: [[newInternalId]] },
//         // D: display name (keep or default to old id)
//         { range: `Sheet1!D${sheetRow}`, values: [[displayName]] },
//         // K: username = old id
//         { range: `Sheet1!K${sheetRow}`, values: [[colA]] },
//         // L: password = encrypt(old id)
//         { range: `Sheet1!L${sheetRow}`, values: [[encrypt(colA)]] },
//       );

//       migrated.push(
//         `row ${sheetRow}: A "${colA}" → internalId "${newInternalId}", K/L set`,
//       );
//     }

//     if (batchData.length === 0) {
//       return new Response(
//         JSON.stringify({
//           message: "All rows already migrated",
//           migrated: 0,
//           skipped: skipped.length,
//         }),
//         { status: 200, headers: { "Content-Type": "application/json" } },
//       );
//     }

//     // Execute all updates in a single batch call
//     await sheets.spreadsheets.values.batchUpdate({
//       spreadsheetId,
//       requestBody: {
//         valueInputOption: "RAW",
//         data: batchData,
//       },
//     });

//     return new Response(
//       JSON.stringify({
//         message: "Migration complete",
//         migrated: migrated.length,
//         skipped: skipped.length,
//         details: migrated,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } },
//     );
//   } catch (error: any) {
//     console.error("Migration error:", error);
//     return new Response(
//       JSON.stringify({
//         error: "Migration failed",
//         details: error?.message ?? "Unknown error",
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } },
//     );
//   }
// }
