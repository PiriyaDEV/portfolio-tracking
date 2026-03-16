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
    const baseHeaders = {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    };

    /* ================= FETCH ================= */

    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;

    const recentUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;

    const [chartRes, recentRes] = await Promise.all([
      fetch(chartUrl, { headers: baseHeaders, cache: "no-store" }),
      fetch(recentUrl, { headers: baseHeaders, cache: "no-store" }),
    ]);

    if (!chartRes.ok || !recentRes.ok) return INITIAL_LEVELS(symbol);

    const chartData = await chartRes.json();
    const recentData = await recentRes.json();

    /* ================= PARSE 3mo ================= */

    const chartResult = chartData?.chart?.result?.[0];
    const chartQuote = chartResult?.indicators?.quote?.[0];

    const highs = (chartQuote?.high ?? []).filter((v: number) => v != null);
    const lows = (chartQuote?.low ?? []).filter((v: number) => v != null);
    const closes = (chartQuote?.close ?? []).filter((v: number) => v != null);

    if (closes.length < 10) return INITIAL_LEVELS(symbol);

    const stableCloses = closes.slice(0, -1);

    /* ================= PARSE 2d ================= */

    const recentResult = recentData?.chart?.result?.[0];
    const recentQuote = recentResult?.indicators?.quote?.[0];
    const recentMeta = recentResult?.meta;

    const recentCloses = (recentQuote?.close ?? []).filter(
      (v: number) => v != null,
    );

    const shortName = recentMeta?.shortName || recentMeta?.symbol || symbol;

    const currentPrice = recentMeta?.regularMarketPrice ?? recentCloses.at(-1);

    const previousClose =
      recentMeta?.chartPreviousClose ?? recentCloses.at(-2) ?? 0;

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
