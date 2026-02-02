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

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${range}&interval=${interval}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo fetch failed: ${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  const meta = result?.meta;
  const timestamps: number[] | undefined = result?.timestamp;
  const closes: (number | null)[] | undefined =
    result?.indicators?.quote?.[0]?.close;

  if (!timestamps || !closes) {
    throw new Error(`Invalid Yahoo data: ${symbol}`);
  }

  const data = timestamps
    .map((t, i) => ({
      time: t,
      close: closes[i],
    }))
    .filter((p) => p.close != null) as { time: number; close: number }[];

  return { meta, data };
}

async function fetchPreviousClose(symbol: string): Promise<number> {
  const { data } = await fetchYahooChart(symbol, "2d", "1d");
  return data[data.length - 2]?.close ?? data[0].close;
}

/* =======================
   Fetch 1D Graph (WITH shortName)
======================= */

function isInUSTradingHoursTH(timestampSec: number): boolean {
  const date = new Date(timestampSec * 1000);

  // แปลงเป็นเวลาไทย
  const th = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
  );
  const hours = th.getHours();
  const minutes = th.getMinutes();

  const timeInMinutes = hours * 60 + minutes;

  // 21:30 → 04:00
  const start = 21 * 60 + 30; // 1290
  const end = 4 * 60; // 240

  return timeInMinutes >= start || timeInMinutes <= end;
}

async function fetch1DGraphForStock(symbol: string) {
  try {
    const interval = "5m";
    const chartRange = "1d";

    const chartRes = await fetchYahooChart(symbol, chartRange, interval);
    const { meta, data: chart } = chartRes;

    const shortName = meta?.shortName || meta?.symbol || symbol;

    // กรองเฉพาะแท่งที่อยู่ในเวลาตลาด US (เวลาไทย)
    const filtered = chart.filter((p) => isInUSTradingHoursTH(p.time));

    // ถ้ายังไม่เปิดตลาด → ไม่มีกราฟ
    if (filtered.length === 0) {
      return {
        symbol,
        shortName,
        base: null,
        data: [],
      };
    }

    const data = filtered.map((p) => ({
      time: p.time,
      price: p.close,
    }));

    return {
      symbol,
      shortName,
      base: data[0].price, // ราคาแท่งแรกของวันนี้จริง ๆ
      data,
    };
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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?range=1y&interval=1mo&events=div`;

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
): DividendAssetResult {
  const originalCurrency = isThaiStock(asset.symbol) ? "THB" : "USD";

  const annualDividend =
    dividendPerShare != null ? dividendPerShare * asset.quantity : null;

  let annualDividendBase: number | null = null;

  if (annualDividend != null) {
    if (baseCurrency === originalCurrency) {
      annualDividendBase = annualDividend;
    } else if (baseCurrency === "THB") {
      annualDividendBase = annualDividend * usdThbRate;
    } else {
      annualDividendBase = annualDividend / usdThbRate;
    }
  }

  const dividendYieldPercent =
    dividendPerShare != null && currentPrice != null && currentPrice > 0
      ? (dividendPerShare / currentPrice) * 100
      : null;

  return {
    originalCurrency,
    dividendPerShare,
    annualDividend,
    annualDividendBase,
    dividendYieldPercent,
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

    const prices: Record<string, number | null> = {};
    const previousPrice: Record<string, number | null> = {};
    const advancedLevels: Record<string, any> = {};

    const dividendSummary = {
      baseCurrency,
      perAsset: {} as Record<string, DividendAssetResult>,
      totalAnnualDividend: 0,
    };

    const validAssets: Asset[] = [];
    const usdThbRate = await fetchUSDTHBRate();

    for (const asset of assets) {
      const { symbol } = asset;

      if (isMock) continue;

      const levels = await getAdvancedLevels(symbol);
      const recommendation = await getRecommendation(symbol, API_KEY);

      advancedLevels[symbol] = { ...levels, recommendation };

      if (levels.currentPrice || levels.previousClose) {
        prices[symbol] = levels.currentPrice ?? null;
        previousPrice[symbol] = levels.previousClose ?? null;

        const dividendPerShare = await fetchTTMDividend(symbol);
        const dividend = calculateDividend(
          asset,
          dividendPerShare,
          levels.currentPrice,
          baseCurrency,
          usdThbRate,
        );

        dividendSummary.perAsset[symbol] = dividend;
        dividendSummary.totalAnnualDividend += dividend.annualDividendBase || 0;

        validAssets.push(asset);
      }
    }

    const graphs: Record<string, any> = {};

    await Promise.all(
      validAssets.map(async (asset) => {
        graphs[asset.symbol] = await fetch1DGraphForStock(asset.symbol);
      }),
    );

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
