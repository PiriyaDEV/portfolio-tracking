import { NextRequest, NextResponse } from "next/server";
import { getAdvancedLevels } from "./support.function";
import { getRecommendation } from "./recommendation.function";
import { isThaiStock } from "@/app/lib/utils";
import { fetchUSDTHBRate } from "@/app/lib/yahoo.helpers";

const API_KEY = process.env.FINNHUB_API_KEY || "";

/* =======================
   Types
======================= */

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type DividendAssetResult = {
  originalCurrency: "THB" | "USD";
  shortName: string | null;
  dividendPerShare: number | null;
  annualDividend: number | null;
  annualDividendBase: number | null;
  dividendYieldPercent: number | null;
};

type GraphResult = {
  symbol: string;
  shortName: string | null;
  base: number | null;
  data: { time: number; price: number }[];
} | null;

/* =======================
   NOTE: fetch1DGraphForStock() has been removed.
   Graph data (1d/1m candles filtered to trading hours) is now produced
   inside getAdvancedLevels() and returned via graphData / graphBase fields.
   This eliminates one Yahoo API call per symbol (was fetching "1d/1m" here
   AND "1d/1d" inside getAdvancedLevels — now only one "1d/1m" fetch happens).
   shortName is also sourced exclusively from levels — no more dual extraction.
======================= */

/* =======================
   Concurrency pool
   FIX: Promise.all over all assets fires every Yahoo + Finnhub request
   simultaneously. With 15+ assets this reliably triggers HTTP 429s from
   Yahoo, causing whole assets to fall back to INITIAL_LEVELS (zeros).
   A concurrency-limited pool caps simultaneous outbound connections without
   changing any function signature — assets still resolve in parallel, just
   with a ceiling of MAX_CONCURRENCY at a time.
======================= */
const MAX_CONCURRENCY = 4;

async function poolAll<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

/* =======================
   Dividend
======================= */

async function fetchTTMDividend(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1mo&events=div`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();
    const dividends = json?.chart?.result?.[0]?.events?.dividends;
    if (!dividends) return null;

    return Object.values(dividends).reduce(
      (sum: number, d: any) => sum + (d.amount || 0),
      0,
    );
  } catch {
    return null;
  }
}

/* =======================
   Calculate Dividend
======================= */

function calculateDividend(
  asset: Asset,
  dividendPerShare: number | null,
  currentPrice: number | null,
  baseCurrency: "THB" | "USD",
  usdThbRate: number,
  shortName: string | null,
): DividendAssetResult {
  const originalCurrency = isThaiStock(asset.symbol) ? "THB" : "USD";
  const annualDividend =
    dividendPerShare != null ? dividendPerShare * asset.quantity : null;

  let annualDividendBase: number | null = null;
  if (annualDividend != null) {
    if (baseCurrency === originalCurrency) annualDividendBase = annualDividend;
    else if (baseCurrency === "THB")
      annualDividendBase = annualDividend * usdThbRate;
    else annualDividendBase = annualDividend / usdThbRate;
  }

  const dividendYieldPercent =
    dividendPerShare != null && currentPrice != null && currentPrice > 0
      ? (dividendPerShare / currentPrice) * 100
      : null;

  return {
    originalCurrency,
    shortName,
    dividendPerShare,
    annualDividend,
    annualDividendBase,
    dividendYieldPercent,
  };
}

/* =======================
   Per-asset processor
======================= */

async function processAsset(
  asset: Asset,
  baseCurrency: "THB" | "USD",
  usdThbRate: number,
) {
  const { symbol } = asset;

  /* Previously 4 parallel calls:
       getAdvancedLevels  → fetchYahooChart("3mo","1d") + fetchYahooChart("1d","1d")
       getRecommendation  → Finnhub
       fetchTTMDividend   → Yahoo dividend endpoint
       fetch1DGraphForStock → fetchYahooChart("1d","1m")   ← REMOVED (redundant)

     Now 3 parallel calls:
       getAdvancedLevels  → fetchYahooChart("3mo","1d") + fetchYahooChart("1d","1m")
                            (also builds graphData/graphBase internally)
       getRecommendation  → Finnhub
       fetchTTMDividend   → Yahoo dividend endpoint
  */
  const [levels, recommendation, dividendPerShare] = await Promise.all([
    getAdvancedLevels(symbol),
    getRecommendation(symbol, API_KEY),
    fetchTTMDividend(symbol),
  ]);

  if (!levels.currentPrice && !levels.previousClose) return null;

  // shortName comes from levels only — no second extraction from a graph fetch
  const shortName = levels.shortName ?? null;

  // Assemble GraphResult from data already returned by getAdvancedLevels
  const graph: GraphResult =
    levels.graphData.length > 0
      ? {
          symbol,
          shortName,
          base: levels.graphBase,
          data: levels.graphData,
        }
      : { symbol, shortName, base: null, data: [] };

  const dividend = calculateDividend(
    asset,
    dividendPerShare,
    levels.currentPrice,
    baseCurrency,
    usdThbRate,
    shortName,
  );

  return {
    asset,
    symbol,
    currentPrice: levels.currentPrice ?? null,
    previousClose: levels.previousClose ?? null,
    advancedLevel: { shortName, ...levels, recommendation },
    dividend,
    graph,
  };
}

/* =======================
   API
======================= */

export async function POST(req: NextRequest) {
  try {
    const {
      assets,
      isMock,
      baseCurrency = "THB",
    }: {
      assets: Asset[];
      isMock?: boolean;
      baseCurrency?: "THB" | "USD";
    } = await req.json();

    if (isMock) {
      return NextResponse.json({
        prices: {},
        previousPrice: {},
        dividendSummary: { baseCurrency, perAsset: {}, totalAnnualDividend: 0 },
        assets: [],
        advancedLevels: {},
        graphs: {},
      });
    }

    const usdThbRate = await fetchUSDTHBRate();

    // FIX: replaced Promise.all with poolAll to cap concurrent Yahoo requests.
    // Firing all assets simultaneously with large portfolios reliably causes
    // HTTP 429 rate-limit errors from Yahoo, which silently zeroes out asset
    // data via the INITIAL_LEVELS fallback. MAX_CONCURRENCY = 4 keeps
    // throughput high while staying under Yahoo's undocumented per-IP limit.
    const results = await poolAll(assets, MAX_CONCURRENCY, (asset) =>
      processAsset(asset, baseCurrency, usdThbRate),
    );

    const prices: Record<string, number | null> = {};
    const previousPrice: Record<string, number | null> = {};
    const advancedLevels: Record<string, any> = {};
    const graphs: Record<string, GraphResult> = {};
    const validAssets: Asset[] = [];
    const dividendSummary = {
      baseCurrency,
      perAsset: {} as Record<string, DividendAssetResult>,
      totalAnnualDividend: 0,
    };

    for (const r of results) {
      if (!r) continue;
      prices[r.symbol] = r.currentPrice;
      previousPrice[r.symbol] = r.previousClose;
      advancedLevels[r.symbol] = r.advancedLevel;
      dividendSummary.perAsset[r.symbol] = r.dividend;
      dividendSummary.totalAnnualDividend += r.dividend.annualDividendBase || 0;
      graphs[r.symbol] = r.graph;
      validAssets.push(r.asset);
    }

    return NextResponse.json({
      prices,
      previousPrice,
      dividendSummary,
      assets: validAssets,
      advancedLevels,
      graphs,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
