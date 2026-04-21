export const dynamic = "force-dynamic";

import {
  fetchPreviousClose,
  fetchYahooChart,
  isInUSTradingHoursTH,
} from "@/app/lib/yahoo.helpers";

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
  // Graph data — merged here to avoid a redundant Yahoo fetch in route.ts
  graphData: { time: number; price: number }[];
  graphBase: number | null;
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
  graphData: [],
  graphBase: null,
});

// FIX: calcEMA now iterates from a tail index directly instead of calling
// data.slice() first. This eliminates one heap allocation per EMA call
// (previously two slice() copies per asset — one for ema20, one for ema50).
//
// The optional `end` parameter lets callers exclude the last (potentially
// incomplete) candle without creating a stableCloses copy beforehand.
//
// Before: slice(-p) → reduce  → 2 allocs per asset
// After:  tail index loop     → 0 allocs per asset
function calcEMA(data: number[], period: number, end = data.length): number {
  const p = Math.min(period, end);
  const k = 2 / (p + 1);
  const start = end - p;
  let ema = data[start];
  for (let i = start + 1; i < end; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

export async function getAdvancedLevels(
  symbol: string = "TSLA",
): Promise<AdvancedLevels> {
  try {
    /* ================= FETCH =================
       Previously route.ts made a separate fetchYahooChart(symbol, "1d", "1d")
       for recent price AND a separate fetch1DGraphForStock() call which used
       fetchYahooChart(symbol, "1d", "1m"). Both hit the same Yahoo endpoint for
       the same symbol on the same day. We now do one "1d/1m" fetch here that
       serves both purposes: 1m candles contain regularMarketPrice in meta
       (same as 1d/1d did), and the candle data feeds the graph directly.
    =============================================== */
    const [chart3mo, chartRecent, prevClose] = await Promise.all([
      fetchYahooChart(symbol, "3mo", "1d"), // for EMA / ATR / swing levels
      fetchYahooChart(symbol, "1d", "1m"), // replaces both the old "1d/1d" and fetch1DGraphForStock
      fetchPreviousClose(symbol),
    ]);

    // ─── DEBUG ───────────────────────────────────────────────
    const metaT = chartRecent.meta;
    console.log(`[${symbol}] chartRecent.meta keys:`, Object.keys(metaT ?? {}));
    console.log(`[${symbol}] chartPreviousClose:`, metaT?.chartPreviousClose);
    console.log(`[${symbol}] regularMarketPrice:`, metaT?.regularMarketPrice);
    console.log(`[${symbol}] recentData length:`, chartRecent.data.length);
    console.log(
      `[${symbol}] recentCloses[-1]:`,
      chartRecent.data.at(-1)?.close,
    );
    console.log(
      `[${symbol}] recentCloses[-2]:`,
      chartRecent.data.at(-2)?.close,
    );
    console.log(`[${symbol}] chartRecent HTTP ok:`, !!metaT); // null meta = failed fetch
    // ─────────────────────────────────────────────────────────

    /* ================= PARSE 3mo ================= */

    const { highs, lows, data: chart3moData } = chart3mo;
    const closes = chart3moData
      .map((p) => p.close)
      .filter((v): v is number => v != null);

    if (closes.length < 10) return INITIAL_LEVELS(symbol);

    // FIX: stableEnd replaces stableCloses = closes.slice(0, -1).
    // Passing an end index to calcEMA avoids copying the entire closes array
    // just to exclude the last element.
    const stableEnd = closes.length - 1;

    /* ================= PARSE recent (1m candles) ================= */

    const { meta, data: recentData } = chartRecent;

    const recentCloses = recentData
      .map((p) => p.close)
      .filter((v): v is number => v != null);

    const shortName = meta?.shortName || meta?.symbol || symbol;

    // meta.regularMarketPrice is the live price — same field the old "1d/1d" fetch used
    const currentPrice = meta?.regularMarketPrice ?? recentCloses.at(-1);
    const previousClose =
      meta?.chartPreviousClose || meta?.previousClose || prevClose;

    /* ================= GRAPH POINTS =================
       Previously fetch1DGraphForStock() did this exact filtering in route.ts.
       We do it here so route.ts can drop that whole function and its
       Promise.all entry.
    =============================================== */
    const inHours = recentData.filter(
      (p): p is { time: number; close: number } =>
        p.close != null && isInUSTradingHoursTH(p.time),
    );
    const graphData = inHours.map((p) => ({ time: p.time, price: p.close }));
    const graphBase = graphData[0]?.price ?? null;

    /* ================= EMA =================
       Both calls pass stableEnd so the incomplete last candle is excluded,
       with zero array allocations.
    =============================================== */
    const ema20 = calcEMA(closes, 20, stableEnd);
    const ema50 = calcEMA(closes, 50, stableEnd);

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
      graphData,
      graphBase,
    };
    return value;
  } catch (error) {
    console.error(`[getAdvancedLevels] Failed for ${symbol}`, error);
    return INITIAL_LEVELS(symbol);
  }
}
