import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export type TimeRange =
  | "1m"
  | "5m"
  | "15m"
  | "1h"
  | "4h"
  | "1d"
  | "1wk"
  | "1mo";

const RANGE_CONFIG: Record<TimeRange, { interval: string; range: string }> = {
  "1m": { interval: "1m", range: "1d" },
  "5m": { interval: "5m", range: "5d" },
  "15m": { interval: "15m", range: "1mo" },
  "1h": { interval: "1h", range: "3mo" },
  "4h": { interval: "1h", range: "6mo" },
  "1d": { interval: "1d", range: "2y" },
  "1wk": { interval: "1wk", range: "5y" },
  "1mo": { interval: "1mo", range: "10y" },
};

const INTRADAY_RANGES = new Set<TimeRange>(["1m", "5m", "15m", "1h", "4h"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const range = (searchParams.get("range") ?? "1d") as TimeRange;

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG["1d"];
  const includePrePost = INTRADAY_RANGES.has(range);

  try {
    // &events=div pulls dividend history into result.events.dividends
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${config.interval}&range=${config.range}&includePrePost=${includePrePost}&events=div`;

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

    const rawPoints = timestamps
      .map((ts, i) => ({
        time: ts * 1000,
        price: closes[i],
        high: highs[i],
        low: lows[i],
        open: opens[i],
        volume: volumes[i] ?? 0,
      }))
      .filter((p) => p.price != null && !isNaN(p.price));

    const points = range === "4h" ? resample4h(rawPoints) : rawPoints;

    // ── Dividend data from events.dividends ───────────────────────────────
    // Yahoo returns dividends as an object keyed by Unix timestamp (seconds):
    // { "1700000000": { amount: 0.25, date: 1700000000 }, ... }
    const rawDivs = result.events?.dividends ?? {};
    const dividendEvents: { date: number; amount: number }[] = Object.values(
      rawDivs as Record<string, { amount: number; date: number }>,
    )
      .map((d) => ({ date: d.date * 1000, amount: d.amount }))
      .sort((a, b) => a.date - b.date);

    // Trailing 12-month dividend (sum of all payments in the last 365 days)
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const trailingDividendRate = dividendEvents
      .filter((d) => d.date >= oneYearAgo)
      .reduce((sum, d) => sum + d.amount, 0);

    // Yield = trailing annual dividend / current price
    const currentPrice: number | null =
      result.meta?.regularMarketPrice ??
      result.meta?.chartPreviousClose ??
      null;
    const dividendYield =
      trailingDividendRate > 0 && currentPrice
        ? trailingDividendRate / currentPrice
        : null;

    // Most recent single payment (for display reference)
    const lastDividend =
      dividendEvents.length > 0
        ? dividendEvents[dividendEvents.length - 1]
        : null;

    return NextResponse.json({
      symbol,
      range,
      previousClose,
      shortName: result.meta?.shortName ?? symbol,
      currency: result.meta?.currency ?? "USD",
      data: points,
      // ── dividend fields ──────────────────────────────────────────────────
      dividendRate: trailingDividendRate > 0 ? trailingDividendRate : null,
      dividendYield,
      lastDividendAmount: lastDividend?.amount ?? null,
      lastDividendDate: lastDividend?.date ?? null,
      dividendEvents,
    });
  } catch (err) {
    console.error("chart-history error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/* ── Resample 1h → 4h buckets ──────────────────────────────────────────── */
type Bar = {
  time: number;
  price: number;
  high: number;
  low: number;
  open: number;
  volume: number;
};

function resample4h(bars: Bar[]): Bar[] {
  if (!bars.length) return [];
  const out: Bar[] = [];
  let bucket: Bar[] = [];

  const flush = () => {
    if (!bucket.length) return;
    out.push({
      time: bucket[0].time,
      open: bucket[0].open,
      high: Math.max(...bucket.map((b) => b.high)),
      low: Math.min(...bucket.map((b) => b.low)),
      price: bucket[bucket.length - 1].price,
      volume: bucket.reduce((s, b) => s + b.volume, 0),
    });
    bucket = [];
  };

  bars.forEach((bar) => {
    const hour = new Date(bar.time).getUTCHours();
    if (bucket.length > 0 && hour % 4 === 0) flush();
    bucket.push(bar);
  });
  flush();
  return out;
}
