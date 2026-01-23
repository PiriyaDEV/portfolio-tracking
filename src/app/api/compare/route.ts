import { NextRequest, NextResponse } from "next/server";

/* =======================
   Types
======================= */

interface Asset {
  symbol: string;
  quantity: number;
  costPerShare: number;
}

type Range = "1d" | "1m" | "1y";

/* =======================
   Yahoo helpers
======================= */

async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: string,
) {
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
       1D → previous close → intraday → close
    ===================================================== */
    if (range === "1d") {
      // previous close (base)
      const [spPrevClose, assetPrevCloses] = await Promise.all([
        fetchPreviousClose("^GSPC"),
        Promise.all(assets.map((a) => fetchPreviousClose(a.symbol))),
      ]);

      // intraday (today)
      const [spIntraday, assetIntraday] = await Promise.all([
        fetchYahooChart("^GSPC", "1d", "5m"),
        Promise.all(assets.map((a) => fetchYahooChart(a.symbol, "1d", "5m"))),
      ]);

      // portfolio base value
      let portfolioBase = 0;
      assetPrevCloses.forEach((p, i) => {
        portfolioBase += p * assets[i].quantity;
      });

      const length = Math.min(
        spIntraday.length,
        ...assetIntraday.map((c) => c.length),
      );

      const data = [];

      // 👇 first point = previous close
      data.push({
        time: spIntraday[0].time,
        portfolioValue: portfolioBase,
        sp500Value: spPrevClose,
      });

      // 👇 intraday points
      for (let i = 0; i < length; i++) {
        let portfolioValue = 0;

        assetIntraday.forEach((chart, idx) => {
          portfolioValue += chart[i].close! * assets[idx].quantity;
        });

        data.push({
          time: spIntraday[i].time,
          portfolioValue,
          sp500Value: spIntraday[i].close!,
        });
      }

      return NextResponse.json({
        range,
        base: {
          portfolio: portfolioBase,
          sp500: spPrevClose,
        },
        data,
      });
    }

    /* =====================================================
       1M / 1Y → historical
    ===================================================== */

    const cfg =
      range === "1m"
        ? { range: "1mo", interval: "1d" }
        : { range: "1y", interval: "1wk" };

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

    return NextResponse.json({ range, data });
  } catch (err: any) {
    console.error("compare api error:", err);
    return NextResponse.json(
      { error: err.message || "server error" },
      { status: 500 },
    );
  }
}
