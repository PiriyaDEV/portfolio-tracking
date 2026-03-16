import { fetchYahooChart } from "@/app/lib/yahoo.helpers";

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
  trend: "ขาขึ้น" | "ขาลง" | "ทรงตัว";
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
  trend: "ทรงตัว",
  recommendation: "",
});

// Cache: 3-month chart data doesn't change minute-to-minute
const cache = new Map<string, { value: AdvancedLevels; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getAdvancedLevels(
  symbol: string = "TSLA",
): Promise<AdvancedLevels> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.value;

  try {
    /* ================= FETCH ================= */

    const [chart3mo, chartRecent] = await Promise.all([
      fetchYahooChart(symbol, "3mo", "1d"),
      fetchYahooChart(symbol, "1d", "1d"),
    ]);

    /* ================= PARSE 3mo ================= */

    const { highs, lows, data: chart3moData } = chart3mo;
    const closes = chart3moData
      .map((p) => p.close)
      .filter((v): v is number => v != null);

    if (closes.length < 10) return INITIAL_LEVELS(symbol);

    const stableCloses = closes.slice(0, -1);

    /* ================= PARSE recent ================= */

    const { meta, data: recentData } = chartRecent;
    const recentCloses = recentData
      .map((p) => p.close)
      .filter((v): v is number => v != null);

    const shortName = meta?.shortName || meta?.symbol || symbol;
    const currentPrice = meta?.regularMarketPrice ?? recentCloses.at(-1);
    const previousClose = meta?.chartPreviousClose ?? recentCloses.at(-2) ?? 0;

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

    let trend: "ขาขึ้น" | "ขาลง" | "ทรงตัว" = "ทรงตัว";
    if (ema20 > ema50 && currentPrice > ema20) trend = "ขาขึ้น";
    else if (ema20 < ema50 && currentPrice < ema20) trend = "ขาลง";

    /* ================= ENTRY ================= */

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
