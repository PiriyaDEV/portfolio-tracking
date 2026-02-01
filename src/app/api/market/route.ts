import { NextResponse } from "next/server";

/* =======================
   Yahoo symbols
======================= */
const SYMBOLS = {
  sp500: "^GSPC",
  gold: "GC=F",
  set: "^SET.BK",
  btc: "BTC-USD",
};

/* =======================
   Yahoo Helper
======================= */
type MarketMode = "dailyMeta" | "intraday" | "rolling24h";

async function getMarketData(symbol: string, mode: MarketMode = "dailyMeta") {
  const url =
    mode === "rolling24h"
      ? `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          symbol,
        )}?interval=1h&range=2d`
      : mode === "intraday"
        ? `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            symbol,
          )}?interval=1m&range=1d`
        : `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            symbol,
          )}?interval=1d&range=2d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Yahoo fetch failed: ${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const closes = quote?.close?.filter((v: number | null) => v != null);

  let currentPrice: number | null = null;
  let previousPrice: number | null = null;

  if (mode === "rolling24h") {
    const timestamps: number[] = result.timestamp;
    const closesRaw: (number | null)[] = quote?.close ?? [];

    if (!timestamps || !closesRaw.length) return null;

    const validCloses = closesRaw.filter(
      (v): v is number => typeof v === "number",
    );

    if (!validCloses.length) return null;

    const nowTs = timestamps[timestamps.length - 1];
    const targetTs = nowTs - 24 * 60 * 60;

    let closestIndex = -1;
    let minDiff = Infinity;

    timestamps.forEach((ts, i) => {
      if (closesRaw[i] == null) return;
      const diff = Math.abs(ts - targetTs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });

    const currentPrice = validCloses.at(-1) ?? null;
    const previousPrice = closestIndex !== -1 ? closesRaw[closestIndex] : null;

    if (!currentPrice || !previousPrice) return null;

    const changePercent =
      ((currentPrice - previousPrice) / previousPrice) * 100;

    return {
      price: currentPrice,
      changePercent: Number(changePercent.toFixed(2)),
    };
  } else if (mode === "intraday") {
    currentPrice = closes?.at(-1) ?? null;
    previousPrice = closes?.[0] ?? null;
  } else {
    currentPrice = meta?.regularMarketPrice ?? closes?.at(-1) ?? null;
    previousPrice = meta?.previousClose ?? closes?.at(-2) ?? null;
  }

  let changePercent: number | null = null;
  if (currentPrice && previousPrice) {
    changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  return {
    price: currentPrice,
    changePercent:
      changePercent !== null ? Number(changePercent.toFixed(2)) : null,
  };
}

/* =======================
   Fear & Greed Helper
======================= */
async function getFearAndGreed() {
  try {
    const res = await fetch(
      "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          Accept: "application/json",
          Referer: "https://edition.cnn.com/",
        },
        next: { revalidate: 3600 }, // CNN updates daily
      },
    );

    if (!res.ok) {
      return { value: null, status: null };
    }

    const json = await res.json();
    const fg = json?.fear_and_greed;

    if (!fg) return { value: null, status: null };

    return {
      value: fg.score ?? null,
      status: fg.rating ?? null,
    };
  } catch {
    return { value: null, status: null };
  }
}

/* =======================
   GET
======================= */
export async function GET() {
  try {
    const [sp500, gold, set, btc, fearGreed] = await Promise.all([
      getMarketData(SYMBOLS.sp500), // daily
      getMarketData(SYMBOLS.gold, "rolling24h"), // ✅ 24h
      getMarketData(SYMBOLS.set), // daily
      getMarketData(SYMBOLS.btc, "rolling24h"), // ✅ 24h
      getFearAndGreed(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sp500,
        gold,
        set,
        btc,
        fearGreed,
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
