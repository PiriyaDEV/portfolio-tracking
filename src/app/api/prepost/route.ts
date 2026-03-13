// app/api/prepost/route.ts
import { NextRequest, NextResponse } from "next/server";

type SessionType = "pre" | "regular" | "post" | "closed";

type PrePostResult = {
  symbol: string;
  currentPrice: number | null;
  previousClose: number | null;
  regularMarketPrice: number | null;
  session: SessionType;
  changePercent: number | null; // % vs previousClose
  prePostChangePercent: number | null; // % vs regularMarketPrice (for pre/post only)
  latestTimestamp: number | null;
};

function getCurrentSession(meta: any): SessionType {
  const nowSec = Math.floor(Date.now() / 1000);
  const tp = meta?.currentTradingPeriod;
  if (!tp) return "closed";

  if (nowSec >= tp.pre?.start && nowSec < tp.pre?.end) return "pre";
  if (nowSec >= tp.regular?.start && nowSec < tp.regular?.end) return "regular";
  if (nowSec >= tp.post?.start && nowSec < tp.post?.end) return "post";
  return "closed";
}

async function fetchPrePost(symbol: string): Promise<PrePostResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=true`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      symbol,
      currentPrice: null,
      previousClose: null,
      regularMarketPrice: null,
      session: "closed",
      changePercent: null,
      prePostChangePercent: null,
      latestTimestamp: null,
    };
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const timestamps: number[] = result?.timestamp ?? [];

  // Latest non-null close
  let latestPrice: number | null = null;
  let latestTimestamp: number | null = null;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) {
      latestPrice = closes[i];
      latestTimestamp = timestamps[i] ?? null;
      break;
    }
  }

  const regularMarketPrice: number | null = meta?.regularMarketPrice ?? null;
  const previousClose: number | null =
    meta?.previousClose ?? meta?.chartPreviousClose ?? null;
  const session = getCurrentSession(meta);

  // % vs previous close
  const changePercent =
    latestPrice != null && previousClose != null && previousClose > 0
      ? ((latestPrice - previousClose) / previousClose) * 100
      : null;

  // % vs regular market price (meaningful only for pre/post)
  const prePostChangePercent =
    (session === "pre" || session === "post") &&
    latestPrice != null &&
    regularMarketPrice != null &&
    regularMarketPrice > 0
      ? ((latestPrice - regularMarketPrice) / regularMarketPrice) * 100
      : null;

  return {
    symbol,
    currentPrice: latestPrice,
    previousClose,
    regularMarketPrice,
    session,
    changePercent,
    prePostChangePercent,
    latestTimestamp,
  };
}

// In-memory cache per symbol — 60s TTL
const cache = new Map<string, { value: PrePostResult; ts: number }>();
const CACHE_TTL_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    const { symbols }: { symbols: string[] } = await req.json();
    if (!symbols?.length) {
      return NextResponse.json({ error: "symbols required" }, { status: 400 });
    }

    const results = await Promise.all(
      symbols.map(async (sym) => {
        const cached = cache.get(sym);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS)
          return cached.value;
        const value = await fetchPrePost(sym);
        cache.set(sym, { value, ts: Date.now() });
        return value;
      }),
    );

    const data: Record<string, PrePostResult> = {};
    for (const r of results) data[r.symbol] = r;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
