export interface PivotLevels {
  support1: number;
  support2: number;
  resistance1: number;
  resistance2: number;
}

const ZERO_LEVELS: PivotLevels = {
  support1: 0,
  support2: 0,
  resistance1: 0,
  resistance2: 0,
};

type Timeframe = "1d" | "3d" | "4d" | "5d" | "6d" | "7d" | "8d" | "1wk" | "1mo";

export async function getSupportResistance(
  symbol: string = "NVDA",
  timeframe: Timeframe = "1d"
): Promise<PivotLevels> {
  let interval = "1d";
  let range = "2d";
  let daysToUse = 1;

  // ---------- CONFIG ----------
  if (timeframe.endsWith("d") && timeframe !== "1d") {
    daysToUse = Number(timeframe.replace("d", ""));
    range = `${daysToUse + 1}d`; // เผื่อวันปัจจุบัน
  } else if (timeframe === "1d") {
    daysToUse = 1;
    range = "2d";
  } else if (timeframe === "1wk") {
    interval = "1wk";
    range = "3wk";
  } else if (timeframe === "1mo") {
    interval = "1mo";
    range = "3mo";
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!quote) return ZERO_LEVELS;

    let high: number;
    let low: number;
    let close: number;

    if (interval === "1d" && daysToUse > 1) {
      // 🔥 Multi-day pivot (3–8 days)
      const highs = quote.high.slice(0, daysToUse);
      const lows = quote.low.slice(0, daysToUse);
      const closes = quote.close.slice(0, daysToUse);

      high = Math.max(...highs);
      low = Math.min(...lows);
      close = closes[closes.length - 1];
    } else {
      // 1d / 1wk / 1mo
      high = quote.high[0];
      low = quote.low[0];
      close = quote.close[0];
    }

    const pivot = (high + low + close) / 3;

    return {
      resistance1: Number((2 * pivot - low).toFixed(2)),
      support1: Number((2 * pivot - high).toFixed(2)),
      resistance2: Number((pivot + (high - low)).toFixed(2)),
      support2: Number((pivot - (high - low)).toFixed(2)),
    };
  } catch {
    return ZERO_LEVELS;
  }
}
