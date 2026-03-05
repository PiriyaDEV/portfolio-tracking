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
   FILTER
======================= */

const SKIP_MESSAGES = [
  "/start",
  "สวัสดี! โปรดเชื่อมบัญชีจากหน้าเว็บพอร์ทัลเพื่อเริ่มรับการแจ้งเตือน",
];

function shouldSkip(text: string): boolean {
  return SKIP_MESSAGES.some((s) => text.trim() === s.trim());
}

/* =======================
   GLOBAL SINGLETON (SAFE)
======================= */

declare global {
  // eslint-disable-next-line no-var
  var _tgClient: TelegramClient | undefined;
  // eslint-disable-next-line no-var
  var _tgClientPromise: Promise<TelegramClient> | undefined;
}

async function getClient(): Promise<TelegramClient> {
  if (global._tgClient) return global._tgClient;

  if (global._tgClientPromise) return global._tgClientPromise;

  global._tgClientPromise = (async () => {
    const client = new TelegramClient(
      new StringSession(sessionStr),
      apiId,
      apiHash,
      { connectionRetries: 5 }
    );
    await client.connect();
    global._tgClient = client;
    return client;
  })();

  return global._tgClientPromise;
}

/* =======================
   GET HANDLER
======================= */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelName = String(searchParams.get("channel") ?? CHANNEL);
    const offset = Number(searchParams.get("offset") ?? 0);
    const limit = Number(searchParams.get("limit") ?? 5);

    const client = await getClient();
    const channel = await client.getEntity(channelName);

    // Fetch extra messages to account for filtered ones
    const messages = await client.getMessages(channel, {
      limit: offset + limit + SKIP_MESSAGES.length + 10,
    });

    const filtered = messages.filter((m) => !shouldSkip(m.text ?? ""));

    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json(
      paginated.map((m) => ({
        id: m.id,
        text: m.text,
        date: m.date,
      }))
    );
  } catch (err: any) {
    console.error("Telegram error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}