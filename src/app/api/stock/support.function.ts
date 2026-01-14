export interface AdvancedLevels {
  symbol: string;
  currentPrice: number;

  ema20: number;
  ema50: number;

  entry1: number;
  entry2: number;

  stopLoss: number;
  resistance: number;

  trend: "UP" | "DOWN" | "SIDEWAYS";
}

/** ---------- SAFE INITIAL FALLBACK ---------- */
const INITIAL_LEVELS = (symbol: string): AdvancedLevels => ({
  symbol,
  currentPrice: 0,

  ema20: 0,
  ema50: 0,

  entry1: 0,
  entry2: 0,

  stopLoss: 0,
  resistance: 0,

  trend: "SIDEWAYS",
});

export async function getAdvancedLevels(
  symbol: string = "TSLA"
): Promise<AdvancedLevels> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[getAdvancedLevels] HTTP error for ${symbol}`);
      return INITIAL_LEVELS(symbol);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    // ❌ Symbol not found / Yahoo error
    if (!result?.indicators?.quote?.[0]) {
      console.warn(`[getAdvancedLevels] Invalid symbol: ${symbol}`);
      return INITIAL_LEVELS(symbol);
    }

    const quotes = result.indicators.quote[0];

    const closes = quotes.close?.filter((v: number) => v != null) ?? [];
    const highs = quotes.high?.filter((v: number) => v != null) ?? [];
    const lows = quotes.low?.filter((v: number) => v != null) ?? [];

    // ❌ Not enough data
    if (closes.length < 20 || highs.length < 20 || lows.length < 20) {
      console.warn(`[getAdvancedLevels] Not enough data for ${symbol}`);
      return INITIAL_LEVELS(symbol);
    }

    const currentPrice = closes[closes.length - 1];

    // ===== EMA (safe) =====
    const ema = (period: number) =>
      closes.slice(-period).reduce((a: any, b: any) => a + b, 0) / period;

    const ema20 = ema(20);
    const ema50 = closes.length >= 50 ? ema(50) : ema20;

    // ===== ATR =====
    let totalTR = 0;
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      totalTR += tr;
    }
    const atr = totalTR / Math.max(1, closes.length - 1);

    // ===== STRUCTURE =====
    const lookback = Math.min(10, lows.length);
    const swingLow = Math.min(...lows.slice(-lookback));
    const swingHigh = Math.max(...highs.slice(-lookback));

    // ===== TREND =====
    let trend: "UP" | "DOWN" | "SIDEWAYS" = "SIDEWAYS";
    if (ema20 > ema50 && currentPrice > ema20) trend = "UP";
    else if (ema20 < ema50 && currentPrice < ema20) trend = "DOWN";

    // ===== ENTRY LOGIC =====
    let entry1 = ema20 - 0.3 * atr;
    let entry2 = Math.max(swingLow, ema50 - 0.5 * atr);

    // ===== SAFETY GUARDS =====
    entry1 = Math.min(entry1, swingHigh - 0.2 * atr);
    entry2 = Math.min(entry2, entry1 - 0.2 * atr);

    const stopLoss = entry2 - 1.2 * atr;

    return {
      symbol,
      currentPrice: Number(currentPrice.toFixed(2)),

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
