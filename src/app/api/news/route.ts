import { NextRequest, NextResponse } from "next/server";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH!;
const sessionStr = process.env.TG_SESSION!;
const CHANNEL = "usstockthailand1";

const SKIP_MESSAGES = [
  "/start",
  "สวัสดี! โปรดเชื่อมบัญชีจากหน้าเว็บพอร์ทัลเพื่อเริ่มรับการแจ้งเตือน",
];

function shouldSkip(text: string): boolean {
  return SKIP_MESSAGES.some((s) => text.trim() === s.trim());
}

declare global {
  var _tgClient: TelegramClient | undefined;
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
      { connectionRetries: 5 },
    );
    await client.connect();
    global._tgClient = client;
    return client;
  })();

  return global._tgClientPromise;
}

async function extractImage(
  client: TelegramClient,
  m: Api.Message,
): Promise<string | null> {
  if (!m.media) {
    // console.log(`[msg ${m.id}] ❌ No media`);
    return null;
  }

  const mediaType = m.media.className;
  // console.log(`[msg ${m.id}] 📦 Media type: ${mediaType}`);

  // ── Photo ──────────────────────────────────────────
  if (mediaType === "MessageMediaPhoto") {
    const photo = (m.media as Api.MessageMediaPhoto).photo;

    if (!photo) {
      // console.log(`[msg ${m.id}] ⚠️ Photo field missing`);
      return null;
    }

    if (photo.className === "PhotoEmpty") {
      // console.log(`[msg ${m.id}] ⚠️ PhotoEmpty`);
      return null;
    }

    const p = photo as Api.Photo;
    // console.log(
    //   `[msg ${m.id}] 🖼️ Photo ID: ${p.id} | sizes: ${p.sizes
    //     .map((s) => ("w" in s ? `${s.type}(${s.w}x${s.h})` : s.type))
    //     .join(", ")}`,
    // );

    try {
      // console.log(`[msg ${m.id}] ⬇️ Downloading photo...`);
      const buffer = (await client.downloadMedia(m.media, {})) as Buffer;
      if (!buffer?.length) {
        // console.log(`[msg ${m.id}] ⚠️ Empty buffer`);
        return null;
      }
      // console.log(`[msg ${m.id}] ✅ Photo ${buffer.length} bytes`);
      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      console.error(`[msg ${m.id}] ❌ Photo download failed:`, e.message);
      return null;
    }
  }

  // ── Document (image file) ──────────────────────────
  if (mediaType === "MessageMediaDocument") {
    const doc = (m.media as Api.MessageMediaDocument).document;
    if (!doc || doc.className === "DocumentEmpty") {
      // console.log(`[msg ${m.id}] ⚠️ DocumentEmpty`);
      return null;
    }

    const d = doc as Api.Document;
    const mimeType = d.mimeType ?? "";
    // console.log(`[msg ${m.id}] 📄 Document mime: ${mimeType}`);

    if (!mimeType.startsWith("image/")) {
      // console.log(`[msg ${m.id}] ⏭️ Non-image document, skipping`);
      return null;
    }

    try {
      const buffer = (await client.downloadMedia(m.media, {})) as Buffer;
      if (!buffer?.length) return null;
      // console.log(`[msg ${m.id}] ✅ Doc image ${buffer.length} bytes`);
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      console.error(`[msg ${m.id}] ❌ Doc download failed:`, e.message);
      return null;
    }
  }

  // ── WebPage (og:image from link preview) ──────────
  if (mediaType === "MessageMediaWebPage") {
    const webpage = (m.media as Api.MessageMediaWebPage).webpage;
    if (!webpage || webpage.className === "WebPageEmpty") {
      // console.log(`[msg ${m.id}] ⚠️ WebPageEmpty`);
      return null;
    }

    const wp = webpage as Api.WebPage;
    const ogPhoto = wp.photo;

    if (!ogPhoto || ogPhoto.className === "PhotoEmpty") {
      // console.log(`[msg ${m.id}] ⚠️ WebPage has no og:image`);
      return null;
    }

    // console.log(
    //   `[msg ${m.id}] 🌐 WebPage og:image ID: ${(ogPhoto as Api.Photo).id}`,
    // );

    try {
      // fallback: download directly from the message media
      const buffer = (await client.downloadMedia(m.media, {})) as Buffer;
      if (!buffer?.length) {
        // console.log(`[msg ${m.id}] ⚠️ Empty buffer for WebPage image`);
        return null;
      }
      // console.log(`[msg ${m.id}] ✅ WebPage image ${buffer.length} bytes`);
      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      console.error(`[msg ${m.id}] ❌ WebPage image failed:`, e.message);
      return null;
    }
  }

  // ── Poll / other (no image) ────────────────────────
  // console.log(`[msg ${m.id}] ⏭️ No image for type: ${mediaType}`);
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelName = String(searchParams.get("channel") ?? CHANNEL);
    const offset = Number(searchParams.get("offset") ?? 0);
    const limit = Number(searchParams.get("limit") ?? 5);

    // console.log(
    //   `\n====== /api/news channel=${channelName} offset=${offset} limit=${limit} ======`,
    // );

    const client = await getClient();
    const channel = await client.getEntity(channelName);

    const messages = await client.getMessages(channel, {
      limit: offset + limit + SKIP_MESSAGES.length + 10,
    });

    const filtered = messages.filter((m) => !shouldSkip(m.text ?? ""));
    const paginated = filtered.slice(offset, offset + limit);

    // console.log(`Processing ${paginated.length} messages`);

    const results = await Promise.all(
      paginated.map(async (m) => {
        // console.log(`\n--- Message ${m.id} ---`);
        const image = await extractImage(client, m);
        // console.log(
        //   `  → image: ${image ? `base64 ~${Math.round(image.length / 1024)}kb` : "null"}`,
        // );

        return {
          id: m.id,
          text: m.text ?? "",
          date: m.date,
          image, // ← base64 string or null
        };
      }),
    );

    // console.log(`====== Done ======\n`);
    return NextResponse.json(results);
  } catch (err: any) {
    console.error("Telegram error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
