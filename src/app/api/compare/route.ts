import { NextRequest, NextResponse } from "next/server";

interface Asset {
  symbol: string;
  quantity: number;
  costPerShare: number;
}

type Range = "1d" | "1m" | "1y";

const RANGE_CONFIG: Record<Range, { range: string; interval: string }> = {
  "1d": { range: "2d", interval: "1d" }, // ← IMPORTANT
  "1m": { range: "1mo", interval: "1d" },
  "1y": { range: "1y", interval: "1wk" },
};

async function fetchYahooChart(symbol: string, range: Range) {
  const { range: yahooRange, interval } = RANGE_CONFIG[range];

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${yahooRange}&interval=${interval}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Yahoo fetch failed: ${symbol}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
    throw new Error(`Invalid Yahoo data: ${symbol}`);
  }

  const timestamps = result.timestamp as number[];
  const closes = result.indicators.quote[0].close as (number | null)[];

  // Remove nulls safely
  const points = timestamps
    .map((t, i) => ({ time: t, close: closes[i] }))
    .filter((p) => p.close != null);

  if (points.length < 2) {
    throw new Error(`Not enough data for ${symbol}`);
  }

  return points;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assets, range } = body as {
      assets: Asset[];
      range: Range;
    };

    // ---------- Validation ----------
    if (!Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: "assets must be non-empty array" },
        { status: 400 },
      );
    }

    if (!["1d", "1m", "1y"].includes(range)) {
      return NextResponse.json(
        { error: "range must be 1d | 1m | 1y" },
        { status: 400 },
      );
    }

    // ---------- Fetch S&P500 ----------
    const sp500Points = await fetchYahooChart("^GSPC", range);

    // ---------- Fetch Assets ----------
    const assetCharts = await Promise.all(
      assets.map((a) => fetchYahooChart(a.symbol, range)),
    );

    // ---------- 1 DAY (Previous close vs latest) ----------
    if (range === "1d") {
      let portfolioPrev = 0;
      let portfolioNow = 0;

      assetCharts.forEach((points, i) => {
        portfolioPrev += points[0].close! * assets[i].quantity;
        portfolioNow += points.at(-1)!.close! * assets[i].quantity;
      });

      return NextResponse.json({
        range,
        data: [
          {
            time: sp500Points[0].time,
            portfolioValue: portfolioPrev,
            sp500Value: sp500Points[0].close,
          },
          {
            time: sp500Points.at(-1)!.time,
            portfolioValue: portfolioNow,
            sp500Value: sp500Points.at(-1)!.close,
          },
        ],
      });
    }

    // ---------- 1M / 1Y (Time series) ----------
    const length = Math.min(
      sp500Points.length,
      ...assetCharts.map((c) => c.length),
    );

    const data = [];

    for (let i = 0; i < length; i++) {
      let portfolioValue = 0;

      assetCharts.forEach((chart, idx) => {
        portfolioValue += chart[i].close! * assets[idx].quantity;
      });

      data.push({
        time: sp500Points[i].time,
        portfolioValue,
        sp500Value: sp500Points[i].close,
      });
    }

    return NextResponse.json({
      range,
      data,
    });
  } catch (err: any) {
    console.error("Portfolio performance API error:", err);

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
