import { NextResponse } from "next/server";

/* =======================
   Yahoo symbols
======================= */
const SYMBOLS = {
  sp500: "^GSPC",
  gold: "GC=F",
  set: "^SET.BK",
  dollar: "DX-Y.NYB",
};

/* =======================
   Helper
======================= */
async function getMarketData(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=2d`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
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
    previousClose,
    changePercent:
      changePercent !== null ? Number(changePercent.toFixed(2)) : null,
  };
}

/* =======================
   GET
======================= */
export async function GET() {
  try {
    const [sp500, gold, set, dollar] = await Promise.all([
      getMarketData(SYMBOLS.sp500),
      getMarketData(SYMBOLS.gold),
      getMarketData(SYMBOLS.set),
      getMarketData(SYMBOLS.dollar),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sp500,
        gold,
        set,
        dollar,
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
