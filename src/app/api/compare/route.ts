import { NextResponse } from "next/server";

/* =======================
   Types
======================= */

interface AssetInput {
  symbol: string;
  quantity: number;
}

type TimeRange = "1D" | "5D" | "1W" | "1M" | "5M" | "1Y";

/* =======================
   Range Mapping (Yahoo)
======================= */

function mapRange(range: TimeRange) {
  switch (range) {
    case "1D":
      return { range: "1d", interval: "5m" };
    case "5D":
      return { range: "5d", interval: "15m" };
    case "1W":
      return { range: "7d", interval: "1d" };
    case "1M":
      return { range: "1mo", interval: "1d" };
    case "5M":
      return { range: "5mo", interval: "1wk" };
    case "1Y":
      return { range: "1y", interval: "1wk" };
  }
}

/* =======================
   Fetch Yahoo Chart
======================= */

async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: string,
) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo fetch failed: ${symbol}`);

  const json = await res.json();
  const result = json.chart.result?.[0];

  if (!result) throw new Error(`No data for ${symbol}`);

  return {
    timestamps: result.timestamp,
    prices: result.indicators.quote[0].close,
  };
}

/* =======================
   POST Handler
======================= */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assets: AssetInput[] = body.assets || [];
    const range: TimeRange = body.range || "1M";

    if (!assets.length) {
      return NextResponse.json(
        { error: "No assets provided" },
        { status: 400 },
      );
    }

    const yahooRange = mapRange(range);

    /* =======================
       Fetch All Assets
    ======================= */

    const assetCharts = await Promise.all(
      assets.map((a) =>
        fetchYahooChart(a.symbol, yahooRange.range, yahooRange.interval),
      ),
    );

    /* =======================
       Fetch S&P 500 (^GSPC)
    ======================= */

    const snpChart = await fetchYahooChart(
      "^GSPC",
      yahooRange.range,
      yahooRange.interval,
    );

    /* =======================
       Build Portfolio Series
    ======================= */

    const length = snpChart.prices.length;

    const portfolioSeries: number[] = [];
    const snpSeries: number[] = [];

    for (let i = 0; i < length; i++) {
      let portfolioValue = 0;

      assetCharts.forEach((chart, idx) => {
        const price = chart.prices[i];
        if (price) {
          portfolioValue += price * assets[idx].quantity;
        }
      });

      portfolioSeries.push(portfolioValue);
      snpSeries.push(snpChart.prices[i]);
    }

    /* =======================
       Normalize (start = 100)
    ======================= */

    const normalize = (arr: number[]) => {
      const base = arr.find((v) => v > 0) || 1;
      return arr.map((v) => Number(((v / base) * 100).toFixed(2)));
    };

    return NextResponse.json({
      dates: snpChart.timestamps.map(
        (t: number) => new Date(t * 1000).toISOString().split("T")[0],
      ),
      portfolio: normalize(portfolioSeries),
      snp500: normalize(snpSeries),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
