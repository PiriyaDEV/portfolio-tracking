import { NextRequest, NextResponse } from "next/server";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

/* =======================
   CONFIG (ENV ONLY)
======================= */

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH!;
const sessionStr = process.env.TG_SESSION!;

// public channel username
const CHANNEL = "usstockthailand1";

/* =======================
   SINGLETON CLIENT
======================= */

let client: TelegramClient | null = null;

async function getClient() {
  if (client) return client;

  client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  return client;
}

/* =======================
   GET HANDLER WITH PAGINATION
======================= */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    const client = await getClient();
    const channel = await client.getEntity(CHANNEL);

    // Telegram's getMessages uses offsetId for pagination
    // We need to fetch all messages up to offset + limit, then slice
    const messages = await client.getMessages(channel, {
      limit: offset + limit,
    });

    // Slice to get only the messages for this page
    const paginatedMessages = messages.slice(offset, offset + limit);

    return NextResponse.json(
      paginatedMessages.map((m) => ({
        id: m.id,
        text: m.text,
        date: m.date,
      })),
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
