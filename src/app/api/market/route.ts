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
async function getMarketData(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
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

  const currentPrice = meta?.regularMarketPrice ?? quote?.close?.at(-1) ?? null;

  const previousClose = meta?.previousClose ?? quote?.close?.at(-2) ?? null;

  let changePercent: number | null = null;

  if (currentPrice && previousClose) {
    changePercent = ((currentPrice - previousClose) / previousClose) * 100;
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
      getMarketData(SYMBOLS.sp500),
      getMarketData(SYMBOLS.gold),
      getMarketData(SYMBOLS.set),
      getMarketData(SYMBOLS.btc),
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
