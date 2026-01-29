import { NextResponse } from "next/server";
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
   GET HANDLER
======================= */

export async function GET() {
  try {
    const client = await getClient();
    const channel = await client.getEntity(CHANNEL);

    const messages = await client.getMessages(channel, { limit: 20 });

    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        text: m.text,
        date: m.date,
      })),
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
