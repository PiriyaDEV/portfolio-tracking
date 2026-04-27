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
   Fixed symbols (always included)
======================= */
const FIXED_SYMBOLS = ["S%26P500"];

/* =======================
   GET
======================= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const symbolsParam = searchParams.get("symbols"); // AAPL,TSLA
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 10);

  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols is required" }, { status: 400 });
  }

  // จำกัดจำนวน ticker ป้องกันยิงเยอะเกิน (4 user + 1 fixed = 5 total)
  const userSymbols = symbolsParam.split(",").slice(0, 4);

  const mergedSymbols = [
    ...FIXED_SYMBOLS,
    ...userSymbols.filter((s) => !FIXED_SYMBOLS.includes(s)),
  ];

  try {
    const allNews: NewsItem[] = [];

    /* =======================
       Fetch ทุก ticker พร้อมกัน
    ======================= */
    const responses = await Promise.all(
      mergedSymbols.map(async (symbol) => {
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

        return parsed.map((item) => ({
          ...item,
          symbol,
        }));
      }),
    );

    responses.forEach((arr) => allNews.push(...arr));

    /* =======================
       DEDUPE (unique)
       ใช้ title + link กันซ้ำ
    ======================= */
    const uniqueMap = new Map<string, NewsItem>();

    for (const item of allNews) {
      const key = `${item.title}-${item.link}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    const deduped = Array.from(uniqueMap.values());

    /* =======================
       SORT ล่าสุดก่อน
    ======================= */
    deduped.sort((a, b) => safeTime(b.pubDate) - safeTime(a.pubDate));

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
