export interface AdvancedLevels {
  symbol: string;

  currentPrice: number;
  previousClose: number;

  ema20: number;
  ema50: number;

  entry1: number; // support 1 (shallow)
  entry2: number; // support 2 (deep)

  stopLoss: number;
  resistance: number;

  trend: "UP" | "DOWN" | "SIDEWAYS";
  recommendation?: any;
}

/** ---------- SAFE INITIAL FALLBACK ---------- */
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
});

/** ---------- MAIN FUNCTION ---------- */
export async function getAdvancedLevels(
  symbol: string = "TSLA",
): Promise<AdvancedLevels> {
  if (symbol === "BINANCE:BTCUSDT") {
    symbol = "BTC-USD";
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[getAdvancedLevels] HTTP error for ${symbol}`);
      return INITIAL_LEVELS(symbol);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result?.indicators?.quote?.[0]) {
      console.warn(`[getAdvancedLevels] Invalid symbol: ${symbol}`);
      return INITIAL_LEVELS(symbol);
    }

    const quotes = result.indicators.quote[0];

    const closes = (quotes.close ?? []).filter((v: number) => v != null);
    const highs = (quotes.high ?? []).filter((v: number) => v != null);
    const lows = (quotes.low ?? []).filter((v: number) => v != null);

    // Absolute minimum guard
    if (closes.length < 10 || highs.length < 10 || lows.length < 10) {
      console.warn(`[getAdvancedLevels] Too little data for ${symbol}`);
      return INITIAL_LEVELS(symbol);
    }

    const meta = result.meta;

    const currentPrice = meta?.regularMarketPrice ?? closes[closes.length - 1];

    const previousClose = meta?.previousClose ?? closes[closes.length - 2];

    /* ================= EMA (ADAPTIVE) ================= */
    const ema = (period: number) => {
      const p = Math.min(period, closes.length);
      return closes.slice(-p).reduce((a: any, b: any) => a + b, 0) / p;
    };

    const ema20 = ema(20);
    const ema50 = ema(50);

    /* ================= ATR ================= */
    let totalTR = 0;
    const len = Math.min(highs.length, lows.length, closes.length);

    for (let i = 1; i < len; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
      totalTR += tr;
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

    /* ================= ENTRY LOGIC ================= */

    // Support 1: shallow pullback
    let entry1 = ema20 - 0.3 * atr;

    // Support 2: deep pullback
    const deepByEMA = ema50 - 1.0 * atr;
    const deepByStructure = swingLow + 0.2 * atr;
    let entry2 = Math.min(deepByEMA, deepByStructure);

    /* ================= ORDER ENFORCEMENT ================= */

    const minGap = 0.8 * atr;

    if (entry2 >= entry1) {
      entry2 = entry1 - minGap;
    }

    /* ================= SAFETY CLAMPS ================= */

    entry1 = Math.min(entry1, swingHigh - 0.3 * atr);
    entry2 = Math.max(entry2, swingLow);

    if (entry2 >= entry1) {
      entry2 = entry1 - minGap;
    }

    /* ================= RISK ================= */

    const stopLossPercent = 0.05;
    const stopLoss = entry2 * (1 - stopLossPercent);

    /* ================= FINAL ================= */

    return {
      symbol,
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
  } catch (error) {
    console.error(`[getAdvancedLevels] Failed for ${symbol}`, error);
    return INITIAL_LEVELS(symbol);
  }
}
