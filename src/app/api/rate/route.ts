import { NextResponse } from "next/server";

/**
 * Fetch USD/THB rate from Yahoo Finance
 * USDTHB=X = THB per 1 USD
 */
async function fetchUSDTHBRate(): Promise<number> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/USDTHB=X?range=5d&interval=1d";

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Yahoo FX fetch failed");
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close;

  if (!closes || closes.length === 0) {
    throw new Error("Invalid Yahoo FX data");
  }

  /**
   * Use latest available close
   * (Yahoo sometimes has null for today)
   */
  const latest = [...closes].reverse().find((c) => c != null);

  if (!latest) {
    throw new Error("No valid FX close price found");
  }

  return latest;
}

/* =======================
   API
======================= */

export async function POST() {
  try {
    const rate = await fetchUSDTHBRate();

    return NextResponse.json(
      {
        pair: "USD/THB",
        rate,
        source: "yahoo",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("FX API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch FX rate" },
      { status: 500 },
    );
  }
}
