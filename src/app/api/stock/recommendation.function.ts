const FINNHUB_BASE = "https://finnhub.io/api/v1";

export interface Recommendation {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export async function getRecommendation(
  symbol: string,
  apiKey: string,
): Promise<Recommendation | null> {
  try {
    const url = `${FINNHUB_BASE}/stock/recommendation?symbol=${symbol}&token=${apiKey}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const latest = data?.[0];

    if (!latest) return null;

    return {
      strongBuy: latest.strongBuy ?? 0,
      buy: latest.buy ?? 0,
      hold: latest.hold ?? 0,
      sell: latest.sell ?? 0,
      strongSell: latest.strongSell ?? 0,
    };
  } catch (error) {
    console.error(`[getRecommendation] Failed for ${symbol}`, error);
    return null;
  }
}
