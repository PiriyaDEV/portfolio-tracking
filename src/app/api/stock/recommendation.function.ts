const FINNHUB_BASE = "https://finnhub.io/api/v1";

export interface Recommendation {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

// Module-level cache: Finnhub recommendations don't change intra-day
const cache = new Map<string, { value: Recommendation | null; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getRecommendation(
  symbol: string,
  apiKey: string,
): Promise<Recommendation | null> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.value;

  try {
    const url = `${FINNHUB_BASE}/stock/recommendation?symbol=${symbol}&token=${apiKey}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

    if (!res.ok) return null;

    const data = await res.json();
    const latest = data?.[0];

    const value: Recommendation | null = latest
      ? {
          strongBuy: latest.strongBuy ?? 0,
          buy: latest.buy ?? 0,
          hold: latest.hold ?? 0,
          sell: latest.sell ?? 0,
          strongSell: latest.strongSell ?? 0,
        }
      : null;

    cache.set(symbol, { value, ts: Date.now() });
    return value;
  } catch (error) {
    console.error(`[getRecommendation] Failed for ${symbol}`, error);
    return null;
  }
}
