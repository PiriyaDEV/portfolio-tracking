import { NextRequest, NextResponse } from "next/server";
import { getAdvancedLevels } from "./support.function";
import { getRecommendation } from "./recommendation.function";
import { isThaiStock } from "@/app/lib/utils";

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

/* =======================
   FX Rate
======================= */

async function fetchUSDTHBRate(): Promise<number> {
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/USDTHB=X?range=5d&interval=1d",
    { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" },
  );

  if (!res.ok) throw new Error("FX fetch failed");

  const json = await res.json();
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
  const latest = [...closes].reverse().find((c: number) => c != null);

  if (!latest) throw new Error("No FX rate found");
  return latest;
}

/* =======================
   Yahoo Chart Helpers
======================= */

function normalizeYahooSymbol(raw: string): string {
  const symbol = raw.trim().toUpperCase();
  switch (symbol) {
    case "TISCO-PVD":
      return "THB=X";
    case "BTC-USD":
      return "BTC-USD";
    case "GOLD-USD":
      return "GC=F";
    default:
      return symbol;
  }
}

type YahooChartResult = {
  meta: any;
  data: { time: number; close: number }[];
};

async function fetchYahooChart(
  rawSymbol: string,
  range: string,
  interval: string,
): Promise<YahooChartResult> {
  const symbol = normalizeYahooSymbol(rawSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo fetch failed: ${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] | undefined = result?.timestamp;
  const closes: (number | null)[] | undefined =
    result?.indicators?.quote?.[0]?.close;

  if (!timestamps || !closes) throw new Error(`Invalid Yahoo data: ${symbol}`);

  const data = timestamps
    .map((t, i) => ({ time: t, close: closes[i] }))
    .filter((p) => p.close != null) as { time: number; close: number }[];

  return { meta: result?.meta, data };
}

/* =======================
   Fetch 1D Graph
======================= */

function isNYSEDaylightSaving(): boolean {
  const now = new Date();
  const year = now.getUTCFullYear();

  const march = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(
    Date.UTC(year, 2, 1 + ((14 - march.getUTCDay()) % 7)),
  );

  const nov = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(Date.UTC(year, 10, 1 + ((7 - nov.getUTCDay()) % 7)));

  return now >= dstStart && now < dstEnd;
}

function isInUSTradingHoursTH(timestampSec: number): boolean {
  const date = new Date(timestampSec * 1000);

  const openUTCHour = isNYSEDaylightSaving() ? 13 : 14;
  const openUTCMinutes = openUTCHour * 60 + 30;
  const closeUTCMinutes = openUTCMinutes + (6 * 60 + 30);

  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();

  return utcMinutes >= openUTCMinutes && utcMinutes <= closeUTCMinutes;
}

type GraphResult = {
  symbol: string;
  shortName: string | null;
  base: number | null;
  data: { time: number; price: number }[];
} | null;

async function fetch1DGraphForStock(symbol: string): Promise<GraphResult> {
  try {
    const { meta, data: chart } = await fetchYahooChart(symbol, "1d", "5m");
    const shortName = meta?.shortName || meta?.symbol || symbol;
    const filtered = chart.filter((p) => isInUSTradingHoursTH(p.time));

    if (filtered.length === 0)
      return { symbol, shortName, base: null, data: [] };

    const data = filtered.map((p) => ({ time: p.time, price: p.close }));
    return { symbol, shortName, base: data[0].price, data };
  } catch (error) {
    console.error(`Failed to fetch 1D graph for ${symbol}:`, error);
    return null;
  }
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

  // Fetch everything in parallel — graph is included here so shortName is reused below
  const [levels, recommendation, dividendPerShare, graph] = await Promise.all([
    getAdvancedLevels(symbol),
    getRecommendation(symbol, API_KEY),
    fetchTTMDividend(symbol),
    fetch1DGraphForStock(symbol),
  ]);

  if (!levels.currentPrice && !levels.previousClose) return null;

  const shortName = graph?.shortName ?? null;

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
    advancedLevel: { ...levels, recommendation },
    dividend,
    graph, // carry the already-fetched graph result forward
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

    const results = await Promise.all(
      assets.map((asset) => processAsset(asset, baseCurrency, usdThbRate)),
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
      graphs[r.symbol] = r.graph; // reuse — no second fetch needed
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
