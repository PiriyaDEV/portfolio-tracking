import { NextRequest, NextResponse } from "next/server";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
};

// simple RSS parser (no library)
function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];

  const matches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of matches.slice(0, 10)) {
    const title =
      item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      item.match(/<title>(.*?)<\/title>/)?.[1];

    const link = item.match(/<link>(.*?)<\/link>/)?.[1];
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const source = item.match(/<source.*?>(.*?)<\/source>/)?.[1];

    if (title && link) {
      items.push({ title, link, pubDate: pubDate || "", source });
    }
  }

  return items;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  // Use the symbol directly as the keyword (dynamic, no static map)
  const keyword = symbol.toUpperCase();

  // Google News Thai
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    keyword,
  )}&hl=th&gl=TH&ceid=TH:th`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "failed to fetch news" },
        { status: 500 },
      );
    }

    const xml = await res.text();
    const news = parseRSS(xml);

    return NextResponse.json({
      symbol,
      keyword,
      total: news.length,
      news,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "unexpected error", detail: String(err) },
      { status: 500 },
    );
  }
}
