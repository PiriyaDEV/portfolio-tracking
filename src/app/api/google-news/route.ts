import { NextRequest, NextResponse } from "next/server";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  symbol: string;
};

/* =======================
   RSS Parser
======================= */
function parseRSS(xml: string): Omit<NewsItem, "symbol">[] {
  const items: Omit<NewsItem, "symbol">[] = [];

  const matches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of matches) {
    const title =
      item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      item.match(/<title>(.*?)<\/title>/)?.[1];

    const link = item.match(/<link>(.*?)<\/link>/)?.[1];
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const source = item.match(/<source.*?>(.*?)<\/source>/)?.[1];

    if (title && link) {
      items.push({
        title,
        link,
        pubDate: pubDate || "",
        source,
      });
    }
  }

  return items;
}

/* =======================
   Helper: safe date
======================= */
function safeTime(dateStr: string) {
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
}

/* =======================
   DEDUPE Helpers
======================= */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // ตัด punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function titleWords(title: string): Set<string> {
  const STOPWORDS = new Set([
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "to",
    "of",
    "and",
    "or",
    "is",
    "are",
    "was",
    "for",
    "by",
    "with",
    "as",
    "its",
    "it",
  ]);
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((w) => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

const SIMILARITY_THRESHOLD = 0.6; // ปรับได้: ต่ำ = กรองเข้มขึ้น, สูง = กรองหลวมลง
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const kept: NewsItem[] = [];

  for (const candidate of items) {
    const candidateWords = titleWords(candidate.title);
    const candidateTime = safeTime(candidate.pubDate);

    const isDuplicate = kept.some((existing) => {
      // ข้ามถ้า pubDate ห่างกันเกิน window
      const timeDiff = Math.abs(candidateTime - safeTime(existing.pubDate));
      if (timeDiff > TIME_WINDOW_MS) return false;

      const similarity = jaccardSimilarity(
        candidateWords,
        titleWords(existing.title),
      );
      return similarity >= SIMILARITY_THRESHOLD;
    });

    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

/* =======================
   Default news (always included)
   key    = คำค้นหา
   source = กรองเฉพาะ source ที่ระบุ (empty array = ไม่กรอง)
======================= */
const DEFAULT_NEWS: { key: string; source: string[] }[] = [
  { key: "อิหร่าน", source: ["LINE TODAY"] },
];

/* =======================
   GET
======================= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const symbolsParam = searchParams.get("symbols");
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 10);

  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols is required" }, { status: 400 });
  }

  const defaultKeys = DEFAULT_NEWS.map((d) => d.key);

  // filter default keys ออกก่อน แล้วค่อย merge — ป้องกัน default โดน slice ทิ้ง
  const userSymbols = symbolsParam
    .split(",")
    .filter((s) => !defaultKeys.includes(s));

  try {
    const allNews: NewsItem[] = [];

    /* =======================
       Fetch DEFAULT_NEWS พร้อม source filter
    ======================= */
    const defaultResponses = await Promise.all(
      DEFAULT_NEWS.map(async ({ key, source: allowedSources }) => {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
          key,
        )}&hl=th&gl=TH&ceid=TH:th`;

        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        });

        if (!res.ok) return [];

        const xml = await res.text();
        const parsed = parseRSS(xml);

        return parsed
          .filter((item) => {
            // ถ้าไม่มี allowedSources หรือ array ว่าง → ไม่กรอง
            if (!allowedSources.length) return true;
            // กรองเฉพาะข่าวที่ source ตรงกับที่ระบุ
            return (
              item.source !== undefined &&
              allowedSources.some(
                (s) => item.source!.toLowerCase() === s.toLowerCase(),
              )
            );
          })
          .map((item) => ({ ...item, symbol: key }));
      }),
    );

    defaultResponses.forEach((arr) => allNews.push(...arr));

    /* =======================
       Fetch user symbols (ไม่มี source filter)
    ======================= */
    const userResponses = await Promise.all(
      userSymbols.map(async (symbol) => {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
          symbol,
        )}&hl=th&gl=TH&ceid=TH:th`;

        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        });

        if (!res.ok) return [];

        const xml = await res.text();
        const parsed = parseRSS(xml);

        return parsed.map((item) => ({ ...item, symbol }));
      }),
    );

    userResponses.forEach((arr) => allNews.push(...arr));

    /* =======================
       DEDUPE
       Step 1: exact (title + link)
       Step 2: sort ล่าสุดก่อน — ให้ข่าวใหม่สุดชนะ fuzzy
       Step 3: fuzzy title (Jaccard + time window)
    ======================= */

    // Step 1: exact dedupe
    const exactMap = new Map<string, NewsItem>();
    for (const item of allNews) {
      const key = `${item.title}-${item.link}`;
      if (!exactMap.has(key)) exactMap.set(key, item);
    }

    // Step 2: sort ก่อน fuzzy
    const sorted = Array.from(exactMap.values()).sort(
      (a, b) => safeTime(b.pubDate) - safeTime(a.pubDate),
    );

    // Step 3: fuzzy dedupe
    const deduped = dedupeNews(sorted);

    /* =======================
       PAGINATION
    ======================= */
    const sliced = deduped.slice(offset, offset + limit);

    return NextResponse.json({
      total: deduped.length,
      offset,
      limit,
      news: sliced,
      hasMore: offset + limit < deduped.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "unexpected error", detail: String(err) },
      { status: 500 },
    );
  }
}
