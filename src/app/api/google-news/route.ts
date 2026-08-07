import { NextRequest, NextResponse } from "next/server";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  symbol: string;
};

/* =======================
   Helper: decode HTML entities
======================= */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

/* =======================
   Helper: detect Thai source
======================= */
function isThaiText(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/* =======================
   Helper: detect spam/scam/casino news
======================= */
function isSpamNews(title: string, source?: string): boolean {
  const spamKeywords = [
    // Casino & Gambling (Thai)
    "\u0E2A\u0E25\u0E47\u0E2D\u0E15",
    "\u0E04\u0E32\u0E2A\u0E34\u0E42\u0E19",
    "\u0E40\u0E14\u0E34\u0E21\u0E1E\u0E31\u0E19",
    "\u0E1E\u0E19\u0E31\u0E19",
    "\u0E41\u0E17\u0E07\u0E1A\u0E2D\u0E25",
    "\u0E40\u0E27\u0E47\u0E1A\u0E1E\u0E19\u0E31\u0E19",
    "\u0E1A\u0E32\u0E04\u0E32\u0E23\u0E48\u0E32",
    "\u0E23\u0E39\u0E40\u0E25\u0E47\u0E15",
    "\u0E44\u0E2E\u0E42\u0E25",
    "\u0E40\u0E2A\u0E37\u0E2D\u0E21\u0E31\u0E07\u0E01\u0E23",
    "\u0E1B\u0E4A\u0E2D\u0E01\u0E40\u0E14\u0E49\u0E07",
    "\u0E19\u0E49\u0E33\u0E40\u0E15\u0E49\u0E32\u0E1B\u0E39\u0E1B\u0E25\u0E32",
    "\u0E2B\u0E27\u0E22",
    "\u0E25\u0E2D\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48",
    "\u0E40\u0E01\u0E21\u0E2A\u0E4C\u0E04\u0E32\u0E2A\u0E34\u0E42\u0E19",
    "\u0E04\u0E32\u0E2A\u0E34\u0E42\u0E19\u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C",
    "\u0E40\u0E25\u0E48\u0E19\u0E1E\u0E19\u0E31\u0E19",
    "\u0E40\u0E01\u0E21\u0E1E\u0E19\u0E31\u0E19",
    "\u0E17\u0E32\u0E22\u0E1C\u0E25",

    // Casino & Gambling (English)
    "casino",
    "slot",
    "poker",
    "blackjack",
    "baccarat",
    "roulette",
    "gambling",
    "betting",
    "ufabet",
    "sagame",
    "sexy gaming",
    "pragmatic play",

    // Scam indicators (Thai)
    "\u0E44\u0E14\u0E49\u0E40\u0E07\u0E34\u0E19\u0E08\u0E23\u0E34\u0E07",
    "\u0E23\u0E31\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E1F\u0E23\u0E35",
    "\u0E42\u0E1A\u0E19\u0E31\u0E2A\u0E1F\u0E23\u0E35",
    "\u0E41\u0E08\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E1F\u0E23\u0E35",
    "\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E1F\u0E23\u0E35",
    "\u0E1D\u0E32\u0E01\u0E16\u0E2D\u0E19\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33",
    "\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E2D\u0E40\u0E22\u0E48\u0E19\u0E15\u0E4C",
    "\u0E40\u0E27\u0E47\u0E1A\u0E15\u0E23\u0E07",
    "\u0E41\u0E15\u0E01\u0E07\u0E48\u0E32\u0E22",
    "\u0E41\u0E15\u0E01\u0E2B\u0E19\u0E31\u0E01",
    "\u0E41\u0E15\u0E01\u0E1A\u0E48\u0E2D\u0E22",
    "\u0E16\u0E2D\u0E19\u0E44\u0E14\u0E49\u0E08\u0E23\u0E34\u0E07",
    "\u0E08\u0E48\u0E32\u0E22\u0E08\u0E23\u0E34\u0E07",
    "\u0E23\u0E27\u0E22\u0E44\u0E27",
    "\u0E23\u0E27\u0E22\u0E40\u0E23\u0E47\u0E27",
    "\u0E17\u0E33\u0E40\u0E07\u0E34\u0E19",
    "\u0E01\u0E33\u0E44\u0E23\u0E41\u0E19\u0E48\u0E19\u0E2D\u0E19",
    "\u0E0A\u0E31\u0E27\u0E23\u0E4C",
    "\u0E42\u0E01\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49",
    "\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 100%",
    "\u0E21\u0E31\u0E48\u0E19\u0E04\u0E07",
    "\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 1",
    "\u0E14\u0E35\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14",
    "\u0E40\u0E27\u0E47\u0E1A\u0E43\u0E2B\u0E0D\u0E48",
    "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E1F\u0E23\u0E35",
    "\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E1F\u0E23\u0E35",
    "\u0E2A\u0E19\u0E38\u0E01\u0E44\u0E1B\u0E01\u0E31\u0E1A",
    "\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E0A\u0E19\u0E30",
    "\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E2A\u0E1A\u0E01\u0E32\u0E23\u0E13\u0E4C",

    // Number patterns that are spam (e.g., 689\u0E2A\u0E25\u0E47\u0E2D\u0E15, 123casino)
    /\d{3,}(\u0E2A\u0E25\u0E47\u0E2D\u0E15|casino|\u0E40\u0E27\u0E47\u0E1A|ufabet|sagame)/i,
  ];

  const lowerTitle = title.toLowerCase();
  const lowerSource = source?.toLowerCase() || "";

  // Check title
  for (const keyword of spamKeywords) {
    if (typeof keyword === "string") {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return true;
      }
    } else if (keyword instanceof RegExp) {
      if (keyword.test(title)) {
        return true;
      }
    }
  }

  // Ban specific spam sources and low-quality news sources
  const bannedSources = [
    "4tamiljmedia",
    "4tamiled",
    "casinothai",
    "slotthai",
    "moomoo", // Community/social trading platform - not reliable news
  ];

  for (const bannedSource of bannedSources) {
    if (lowerSource.includes(bannedSource)) {
      return true;
    }
  }

  return false;
}

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
        title: decodeHTMLEntities(title),
        link: decodeHTMLEntities(link),
        pubDate: pubDate || "",
        source: source ? decodeHTMLEntities(source) : undefined,
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

// AFTER — remove the time window entirely
const SIMILARITY_THRESHOLD = 0.6;

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const kept: NewsItem[] = [];

  for (const candidate of items) {
    const candidateWords = titleWords(candidate.title);

    const isDuplicate = kept.some((existing) => {
      const similarity = jaccardSimilarity(
        candidateWords,
        titleWords(existing.title),
      );
      return similarity >= SIMILARITY_THRESHOLD;
    });

    if (!isDuplicate) kept.push(candidate);
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
  const MAPPING_KEY: Record<string, string> = {
    // Single letter symbols
    C: "Citigroup",
    D: "Dominion Energy",
    F: "Ford Motor",
    K: "Kellogg",
    M: "Macy's",
    O: "Realty Income Corp",
    T: "AT&T",
    U: "Unity Software",
    V: "Visa Inc",
    W: "Wayfair",
    X: "United States Steel Corp",
    Z: "Zillow",

    // Common words or short symbols
    AI: "C3.ai",
    APPS: "Digital Turbine",
    BEST: "Best Inc",
    BOX: "Box Inc",
    CAKE: "Cheesecake Factory",
    COIN: "Coinbase",
    DASH: "DoorDash",
    FIVE: "Five Below",
    GO: "Grocery Outlet",
    GOLD: "Barrick Gold",
    GOOD: "Gladstone Commercial",
    HOME: "At Home Group",
    HOOD: "Robinhood",
    IT: "Gartner",
    LOVE: "Lovesac Company",
    NET: "Cloudflare",
    NICE: "NICE Ltd",
    NOW: "ServiceNow",
    ON: "ON Semiconductor",
    ONE: "OneSpaWorld",
    PATH: "UiPath",
    PINS: "Pinterest",
    PLAY: "Dave & Buster's Entertainment",
    PLUG: "Plug Power",
    RUN: "Sunrun",
    SHOP: "Shopify",
    SNAP: "Snap Inc",
    SPOT: "Spotify",
    SQ: "Block",
    TEAM: "Atlassian",
  };

  const symbolsParam = searchParams.get("symbols");
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 10);

  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols is required" }, { status: 400 });
  }

  const rawSymbols = symbolsParam.split(",").map((s) => s.trim());

  const dynamicDefaultNews = [...DEFAULT_NEWS];

  if (rawSymbols.includes("GC=F")) {
    dynamicDefaultNews.push({
      key: "ทองคำ",
      source: ["LINE TODAY"],
    });
  }

  const defaultKeys = dynamicDefaultNews.map((d) => d.key);

  // filter default keys ออกก่อน แล้วค่อย merge — ป้องกัน default โดน slice ทิ้ง
  // เก็บทั้ง original symbol และ mapped search term
  const userSymbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => !defaultKeys.includes(s))
    .map((s) => ({
      original: s,
      searchTerm: MAPPING_KEY[s] ?? s,
    }));

  try {
    const allNews: NewsItem[] = [];

    /* =======================
       Fetch DEFAULT_NEWS พร้อม source filter
    ======================= */
    const defaultResponses = await Promise.all(
      dynamicDefaultNews.map(async ({ key, source: allowedSources }) => {
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
            // Filter spam/scam news
            if (isSpamNews(item.title, item.source)) return false;

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
      userSymbols.map(async ({ original, searchTerm }) => {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
          searchTerm,
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
            // Filter spam/scam news
            if (isSpamNews(item.title, item.source)) return false;

            const sourceIsThai = item.source ? isThaiText(item.source) : false;
            const titleHasThai = isThaiText(item.title);

            return !sourceIsThai && titleHasThai;
          })
          .map((item) => ({ ...item, symbol: original }));
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
