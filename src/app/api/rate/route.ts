// app/api/rate/route.ts

import { NextResponse } from "next/server";

/** In-memory cache */
let cachedRate: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchUSDTHBRate(): Promise<number> {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/USDTHB=X";

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!res.ok) throw new Error("Yahoo FX fetch failed");

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close;

  if (!closes || closes.length === 0) throw new Error("Invalid Yahoo FX data");

  const latest = [...closes].reverse().find((c) => c != null);
  if (!latest) throw new Error("No valid FX close price found");

  return latest;
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached value if still fresh
    if (cachedRate !== null && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        { pair: "USD/THB", rate: cachedRate, source: "yahoo", cached: true },
        { status: 200 },
      );
    }

    // Fetch fresh and update cache
    const rate = await fetchUSDTHBRate();
    cachedRate = rate;
    cacheTimestamp = now;

    return NextResponse.json(
      { pair: "USD/THB", rate, source: "yahoo", cached: false },
      { status: 200 },
    );
  } catch (error) {
    console.error("FX API error:", error);

    // Serve stale cache on error rather than failing
    if (cachedRate !== null) {
      return NextResponse.json(
        {
          pair: "USD/THB",
          rate: cachedRate,
          source: "yahoo",
          cached: true,
          stale: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch FX rate" },
      { status: 500 },
    );
  }
}
