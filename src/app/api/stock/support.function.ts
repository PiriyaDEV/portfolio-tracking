export interface AdvancedLevels {
  symbol: string;
  shortName?: string;
  currentPrice: number;
  previousClose: number;
  ema20: number;
  ema50: number;
  entry1: number;
  entry2: number;
  stopLoss: number;
  resistance: number;
  trend: "UP" | "DOWN" | "SIDEWAYS";
  recommendation?: any;
}

const INITIAL_LEVELS = (symbol: string): AdvancedLevels => ({
  symbol,
  currentPrice: 0,
  previousClose: 0,
  ema20: 0,
  ema50: 0,
  entry1: 0,
  entry2: 0,
  stopLoss: 0,
  resistance: 0,
  trend: "SIDEWAYS",
  recommendation: "",
});

const SYMBOL_MAP: Record<string, string> = {
  "GOLD-USD": "GC=F",
  "TISCO-PVD": "THB=X",
};

// Cache: 3-month chart data doesn't change minute-to-minute
const cache = new Map<string, { value: AdvancedLevels; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getAdvancedLevels(
  symbol: string = "TSLA",
): Promise<AdvancedLevels> {
  symbol = SYMBOL_MAP[symbol] ?? symbol;

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.value;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return INITIAL_LEVELS(symbol);

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const quotes = result?.indicators?.quote?.[0];
    const shortName = result?.meta?.shortName || result?.meta?.symbol || symbol;

    if (!quotes) return INITIAL_LEVELS(symbol);

    const closes = (quotes.close ?? []).filter(
      (v: number) => v != null,
    ) as number[];
    const stableCloses = closes.slice(0, -1);
    const highs = (quotes.high ?? []).filter(
      (v: number) => v != null,
    ) as number[];
    const lows = (quotes.low ?? []).filter(
      (v: number) => v != null,
    ) as number[];

    if (closes.length < 10 || highs.length < 10 || lows.length < 10) {
      return INITIAL_LEVELS(symbol);
    }

    const meta = result.meta;
    const currentPrice = meta?.regularMarketPrice ?? closes[closes.length - 1];

    const lastClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const isIncomplete = lastClose === prevClose;

    const previousClose = isIncomplete
      ? (closes[closes.length - 3] ?? closes[closes.length - 2])
      : closes[closes.length - 2];

    // console.log(
    //   "stock",
    //   symbol,
    //   "lastClose",
    //   lastClose,
    //   "prevClose",
    //   prevClose,
    //   "isIncomplete",
    //   isIncomplete,
    //   "previousClose",
    //   previousClose,
    // );

    /* ================= EMA ================= */
    function calcEMA(data: number[], period: number): number {
      const p = Math.min(period, data.length);
      const slice = data.slice(-p);
      const k = 2 / (p + 1);
      return slice.reduce((prev, curr) => curr * k + prev * (1 - k), slice[0]);
    }

    const ema20 = calcEMA(stableCloses, 20);
    const ema50 = calcEMA(stableCloses, 50);

    /* ================= ATR ================= */
    const len = Math.min(highs.length, lows.length, closes.length);
    let totalTR = 0;

    for (let i = 1; i < len; i++) {
      totalTR += Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
    }

    const atr = totalTR / Math.max(1, len - 1);

    /* ================= STRUCTURE ================= */
    const lookback = Math.min(10, lows.length);
    const swingLow = Math.min(...lows.slice(-lookback));
    const swingHigh = Math.max(...highs.slice(-lookback));

    /* ================= TREND ================= */
    let trend: "UP" | "DOWN" | "SIDEWAYS" = "SIDEWAYS";
    if (ema20 > ema50 && currentPrice > ema20) trend = "UP";
    else if (ema20 < ema50 && currentPrice < ema20) trend = "DOWN";

    /* ================= ENTRY LEVELS ================= */
    let entry1 = ema20 - 0.3 * atr;
    let entry2 = Math.min(ema50 - 1.0 * atr, swingLow + 0.2 * atr);

    const minGap = 0.8 * atr;

    if (entry2 >= entry1) entry2 = entry1 - minGap;

    entry1 = Math.min(entry1, swingHigh - 0.3 * atr);
    entry2 = Math.max(entry2, swingLow);

    if (entry2 >= entry1) entry2 = entry1 - minGap;

    const stopLoss = entry2 * 0.95;

    const value: AdvancedLevels = {
      symbol,
      shortName,
      currentPrice: Number(currentPrice.toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      ema20: Number(ema20.toFixed(2)),
      ema50: Number(ema50.toFixed(2)),
      entry1: Number(entry1.toFixed(2)),
      entry2: Number(entry2.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      resistance: Number(swingHigh.toFixed(2)),
      trend,
    };

    cache.set(symbol, { value, ts: Date.now() });
    return value;
  } catch (error) {
    console.error(`[getAdvancedLevels] Failed for ${symbol}`, error);
    return INITIAL_LEVELS(symbol);
  }
}
