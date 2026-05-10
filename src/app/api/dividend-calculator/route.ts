// app/api/dividend-calculator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isThaiStock } from "@/app/lib/utils";
import { fetchUSDTHBRate } from "@/app/lib/yahoo.helpers";

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    return meta?.regularMarketPrice ?? meta?.previousClose ?? null;
  } catch {
    return null;
  }
}

async function fetchTTMDividendPerShare(
  symbol: string,
): Promise<number | null> {
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

async function fetchShortName(symbol: string): Promise<string | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta?.shortName ?? null;
  } catch {
    return null;
  }
}

// GET /api/dividend-calculator?symbol=AAPL
// Lightweight — fetches only currentPrice + shortName + currency, called right after stock select
export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get("symbol");
    if (!symbol)
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

    const isThai = isThaiStock(symbol);
    const originalCurrency = isThai ? "THB" : "USD";

    const [currentPrice, shortName] = await Promise.all([
      fetchCurrentPrice(symbol),
      fetchShortName(symbol),
    ]);

    return NextResponse.json({
      symbol,
      shortName,
      currentPrice,
      originalCurrency,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      symbol,
      investmentAmount, // in THB always (user input)
      costPerShare, // in original currency (THB for TH, USD for US)
      useCurrentPrice, // boolean
    }: {
      symbol: string;
      investmentAmount: number;
      costPerShare?: number;
      useCurrentPrice: boolean;
    } = await req.json();

    if (!symbol || !investmentAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const isThai = isThaiStock(symbol);
    const originalCurrency = isThai ? "THB" : "USD";

    const [currentPrice, dividendPerShare, shortName, usdThbRate] =
      await Promise.all([
        fetchCurrentPrice(symbol),
        fetchTTMDividendPerShare(symbol),
        fetchShortName(symbol),
        fetchUSDTHBRate(),
      ]);

    // Determine effective cost per share (in original currency)
    let effectiveCostPerShare: number | null = useCurrentPrice
      ? currentPrice
      : (costPerShare ?? null);

    // Convert investmentAmount (THB) → shares
    // If US stock, convert THB → USD first
    let effectiveCostInTHB: number | null = null;
    let shares: number | null = null;

    if (effectiveCostPerShare != null && effectiveCostPerShare > 0) {
      if (isThai) {
        effectiveCostInTHB = effectiveCostPerShare;
      } else {
        effectiveCostInTHB = effectiveCostPerShare * usdThbRate;
      }
      shares = investmentAmount / effectiveCostInTHB;
    }

    // Annual dividend in original currency
    const annualDividendOriginal =
      dividendPerShare != null && shares != null
        ? dividendPerShare * shares
        : null;

    // Annual dividend in THB
    const annualDividendTHB =
      annualDividendOriginal != null
        ? isThai
          ? annualDividendOriginal
          : annualDividendOriginal * usdThbRate
        : null;

    // Dividend yield %
    const dividendYieldPercent =
      dividendPerShare != null &&
      effectiveCostPerShare != null &&
      effectiveCostPerShare > 0
        ? (dividendPerShare / effectiveCostPerShare) * 100
        : null;

    return NextResponse.json({
      symbol,
      shortName,
      originalCurrency,
      currentPrice,
      effectiveCostPerShare,
      shares,
      dividendPerShare,
      annualDividendOriginal,
      annualDividendTHB,
      dividendYieldPercent,
      usdThbRate,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
