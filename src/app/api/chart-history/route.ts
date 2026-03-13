import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export type TimeRange = "1m" | "1h" | "1d" | "5d" | "1mo";

const RANGE_CONFIG: Record<TimeRange, { interval: string; range: string }> = {
  "1m": { interval: "1m", range: "1d" },
  "1h": { interval: "1h", range: "5d" },
  "1d": { interval: "1d", range: "1mo" },
  "5d": { interval: "1wk", range: "6mo" },
  "1mo": { interval: "1mo", range: "2y" },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const range = (searchParams.get("range") ?? "1d") as TimeRange;

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG["1d"];

  const includePrePost = range === "1m";

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${config.interval}&range=${config.range}&includePrePost=${includePrePost}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance error: ${res.status}` },
        { status: res.status },
      );
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }

    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const highs: number[] = result.indicators?.quote?.[0]?.high ?? [];
    const lows: number[] = result.indicators?.quote?.[0]?.low ?? [];
    const opens: number[] = result.indicators?.quote?.[0]?.open ?? [];
    const volumes: number[] = result.indicators?.quote?.[0]?.volume ?? [];

    const previousClose: number | null =
      result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null;

    const points = timestamps
      .map((ts, i) => ({
        time: ts * 1000,
        price: closes[i],
        high: highs[i],
        low: lows[i],
        open: opens[i],
        volume: volumes[i],
      }))
      .filter((p) => p.price != null && !isNaN(p.price));

    return NextResponse.json({
      symbol,
      range,
      previousClose,
      shortName: result.meta?.shortName ?? symbol,
      currency: result.meta?.currency ?? "USD",
      data: points,
    });
  } catch (err) {
    console.error("chart-history error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
