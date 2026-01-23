import { NextRequest, NextResponse } from "next/server";

/* =======================
   Types
======================= */

interface Asset {
  symbol: string;
  quantity: number;
  costPerShare: number;
}

type Range = "1d" | "5d" | "1m" | "6m" | "1y";

/* =======================
   Yahoo helpers
======================= */

async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: string,
) {
  if (symbol === "BINANCE:BTCUSDT") symbol = "BTC";

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

  const timestamps: number[] = result?.timestamp;
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close;

  if (!timestamps || !closes) {
    throw new Error(`Invalid Yahoo data: ${symbol}`);
  }

  return timestamps
    .map((t, i) => ({
      time: t,
      close: closes[i],
    }))
    .filter((p) => p.close != null);
}

async function fetchPreviousClose(symbol: string): Promise<number> {
  const data = await fetchYahooChart(symbol, "2d", "1d");
  if (data.length < 2) {
    throw new Error(`No previous close for ${symbol}`);
  }
  return data[data.length - 2].close!;
}

/* =======================
   Range config
======================= */

const RANGE_CONFIG: Record<
  Exclude<Range, "1d">,
  { range: string; interval: string }
> = {
  "5d": { range: "5d", interval: "1d" },
  "1m": { range: "1mo", interval: "1d" },
  "6m": { range: "6mo", interval: "1wk" },
  "1y": { range: "1y", interval: "1wk" },
};

/* =======================
   API
======================= */

export async function POST(req: NextRequest) {
  try {
    const { assets, range } = (await req.json()) as {
      assets: Asset[];
      range: Range;
    };

    if (!assets?.length) {
      return NextResponse.json({ error: "assets required" }, { status: 400 });
    }

    /* =====================================================
       1D → intraday vs previous close
    ===================================================== */

    if (range === "1d") {
      const interval = "5m";
      const chartRange = "1d";

      const [spPrevClose, assetPrevCloses] = await Promise.all([
        fetchPreviousClose("^GSPC"),
        Promise.all(assets.map((a) => fetchPreviousClose(a.symbol))),
      ]);

      const [spChart, assetCharts] = await Promise.all([
        fetchYahooChart("^GSPC", chartRange, interval),
        Promise.all(
          assets.map((a) => fetchYahooChart(a.symbol, chartRange, interval)),
        ),
      ]);

      const basePortfolio = assetPrevCloses.reduce(
        (sum, price, i) => sum + price * assets[i].quantity,
        0,
      );

      const length = Math.min(
        spChart.length,
        ...assetCharts.map((c) => c.length),
      );

      const data = [
        {
          time: spChart[0]?.time,
          portfolioValue: basePortfolio,
          sp500Value: spPrevClose,
        },
      ];

      for (let i = 0; i < length; i++) {
        let portfolioValue = 0;

        assetCharts.forEach((chart, idx) => {
          portfolioValue += chart[i].close! * assets[idx].quantity;
        });

        data.push({
          time: spChart[i].time,
          portfolioValue,
          sp500Value: spChart[i].close!,
        });
      }

      return NextResponse.json({
        range,
        base: {
          portfolio: basePortfolio,
          sp500: spPrevClose,
        },
        data,
      });
    }

    /* =====================================================
       5D / 1M / 6M / 1Y → historical
    ===================================================== */

    const cfg = RANGE_CONFIG[range];

    const [spChart, assetCharts] = await Promise.all([
      fetchYahooChart("^GSPC", cfg.range, cfg.interval),
      Promise.all(
        assets.map((a) => fetchYahooChart(a.symbol, cfg.range, cfg.interval)),
      ),
    ]);

    const length = Math.min(
      spChart.length,
      ...assetCharts.map((c) => c.length),
    );

    /* ---------- BASE (first candle) ---------- */

    const basePortfolio = assetCharts.reduce(
      (sum, chart, i) => sum + chart[0].close! * assets[i].quantity,
      0,
    );

    const baseSP500 = spChart[0].close!;

    const data = [];

    for (let i = 0; i < length; i++) {
      let portfolioValue = 0;

      assetCharts.forEach((chart, idx) => {
        portfolioValue += chart[i].close! * assets[idx].quantity;
      });

      data.push({
        time: spChart[i].time,
        portfolioValue,
        sp500Value: spChart[i].close!,
      });
    }

    return NextResponse.json({
      range,
      base: {
        portfolio: basePortfolio,
        sp500: baseSP500,
      },
      data,
    });
  } catch (err: any) {
    console.error("compare api error:", err);
    return NextResponse.json(
      { error: err.message || "server error" },
      { status: 500 },
    );
  }
}
