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

export async function getSupportResistance(
  symbol: string = "NVDA"
): Promise<PivotLevels> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;

  try {
    const response = await fetch(url);
    if (!response.ok) return ZERO_LEVELS;

    const data = await response.json();

    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];

    if (!quote) return ZERO_LEVELS;

    // Filter out null / undefined / non-number values
    const highs = (quote.high ?? []).filter(
      (v: unknown): v is number => typeof v === "number"
    );
    const lows = (quote.low ?? []).filter(
      (v: unknown): v is number => typeof v === "number"
    );
    const closes = (quote.close ?? []).filter(
      (v: unknown): v is number => typeof v === "number"
    );

    // Ensure we have usable data
    if (!highs.length || !lows.length || !closes.length) {
      return ZERO_LEVELS;
    }

    const periodHigh = Math.max(...highs);
    const periodLow = Math.min(...lows);
    const lastClose = closes[closes.length - 1];

    if (
      !Number.isFinite(periodHigh) ||
      !Number.isFinite(periodLow) ||
      !Number.isFinite(lastClose)
    ) {
      return ZERO_LEVELS;
    }

    const pivot = (periodHigh + periodLow + lastClose) / 3;

    if (!Number.isFinite(pivot)) return ZERO_LEVELS;

    return {
      resistance1: Number((2 * pivot - periodLow).toFixed(2)),
      support1: Number((2 * pivot - periodHigh).toFixed(2)),
      resistance2: Number((pivot + (periodHigh - periodLow)).toFixed(2)),
      support2: Number((pivot - (periodHigh - periodLow)).toFixed(2)),
    };
  } catch (error) {
    console.error("Error fetching support/resistance:", error);
    return ZERO_LEVELS;
  }
}
