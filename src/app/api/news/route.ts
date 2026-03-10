import { NextRequest, NextResponse } from "next/server";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH!;
const sessionStr = process.env.TG_SESSION!;
const CHANNEL = "usstockthailand1";

const SKIP_MESSAGES = new Set([
  "/start",
  "สวัสดี! โปรดเชื่อมบัญชีจากหน้าเว็บพอร์ทัลเพื่อเริ่มรับการแจ้งเตือน",
]);

const shouldSkip = (text: string) => SKIP_MESSAGES.has(text.trim());

const WETHAIINVEST_STRIPS = [
  `📔 ข้อมูลและไอเดียการเทรดทั้งหมดนี้ เป็นเพียงกรณีศึกษาเพื่อนำไปต่อยอดเท่านั้น ไม่ใช่การชี้นำต้องลงทุน เพื่อนๆควรนำไปศึกษาทำการบ้านเพิ่มเติมเพื่อตัดสินใจด้วยตัวเอง ต้องไม่ลืมว่า "ต้นทุนค่าเฉลี่ย, เงินสำรอง, การแบ่งไม้เข้าซื้อ, กลยุทธ์ รวมถึงการรับความเสี่ยง" ของเราแต่ละคนไม่เท่ากัน การลงทุนที่ดีควรยึดเป้าหมาย และหน้าตักพอร์ตของเราเป็นหลักเสมอครับ`,
  `https://wethaiinvest.com`,
];

function cleanWethaiinvestText(text: string): string {
  let cleaned = text;
  for (const strip of WETHAIINVEST_STRIPS) {
    cleaned = cleaned.split(strip).join("");
  }
  // Remove "📅 อัปเดตเมื่อ..." lines
  cleaned = cleaned.replace(/📅\s*อัปเดตเมื่อ[^\n]*/g, "");
  // Trim leading whitespace from each line, then trim the whole string
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n")
    .trim();
  return cleaned;
}

/* =======================
   Singleton Telegram client
======================= */

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

/* =======================
   Image extraction
======================= */

async function downloadMediaAsBase64(
  client: TelegramClient,
  media: Api.TypeMessageMedia,
  mimeType = "image/jpeg",
): Promise<string | null> {
  const buffer = (await client.downloadMedia(media, {})) as Buffer;
  if (!buffer?.length) return null;
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function extractImage(
  client: TelegramClient,
  m: Api.Message,
): Promise<string | null> {
  if (!m.media) return null;

  const { media } = m;

  switch (media.className) {
    case "MessageMediaPhoto": {
      const photo = (media as Api.MessageMediaPhoto).photo;
      if (!photo || photo.className === "PhotoEmpty") return null;
      try {
        return await downloadMediaAsBase64(client, media);
      } catch (e: any) {
        console.error(`[msg ${m.id}] Photo download failed:`, e.message);
        return null;
      }
    }

    case "MessageMediaDocument": {
      const doc = (media as Api.MessageMediaDocument).document;
      if (!doc || doc.className === "DocumentEmpty") return null;
      const mimeType = (doc as Api.Document).mimeType ?? "";
      if (!mimeType.startsWith("image/")) return null;
      try {
        return await downloadMediaAsBase64(client, media, mimeType);
      } catch (e: any) {
        console.error(`[msg ${m.id}] Doc download failed:`, e.message);
        return null;
      }
    }

    case "MessageMediaWebPage": {
      const webpage = (media as Api.MessageMediaWebPage).webpage;
      if (!webpage || webpage.className === "WebPageEmpty") return null;
      const wp = webpage as Api.WebPage;
      if (!wp.photo || wp.photo.className === "PhotoEmpty") return null;
      try {
        return await downloadMediaAsBase64(client, media);
      } catch (e: any) {
        console.error(`[msg ${m.id}] WebPage image failed:`, e.message);
        return null;
      }
    }

    default:
      return null;
  }
}

/* =======================
   GET handler
======================= */

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const channelName = params.get("channel") ?? CHANNEL;
    const offset = Number(params.get("offset") ?? 0);
    const limit = Number(params.get("limit") ?? 5);

    const isWethaiinvest = channelName === "wethaiinvestbot";

    // Fetch client + channel entity in parallel
    const [client] = await Promise.all([getClient()]);
    const channel = await client.getEntity(channelName);

    const messages = await client.getMessages(channel, {
      limit: offset + limit + SKIP_MESSAGES.size + 10,
    });

    const paginated = messages
      .filter((m) => !shouldSkip(m.text ?? ""))
      .slice(offset, offset + limit);

    const results = await Promise.all(
      paginated.map(async (m) => {
        let text = m.text ?? "";
        if (isWethaiinvest) text = cleanWethaiinvestText(text);
        // Collapse 3+ consecutive newlines to max 2 for all channels
        text = text.replace(/\n{3,}/g, "\n\n").trim();

        return {
          id: m.id,
          text,
          date: m.date,
          image: await extractImage(client, m),
        };
      }),
    );

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("Telegram error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
