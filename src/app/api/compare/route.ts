import { isThaiStock } from "@/app/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchYahooChart,
  fetchUSDTHBRate,
  fetchPreviousClose,
  ChartPoint,
} from "@/app/lib/yahoo.helpers";

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
   Currency helpers
======================= */

function toUSD(price: number, symbol: string, usdThbRate: number): number {
  return isThaiStock(symbol) ? price / usdThbRate : price;
}

/* =======================
   Range config
======================= */

const RANGE_CONFIG: Record<
  Exclude<Range, "1d">,
  { range: string; interval: string }
> = {
  "5d": { range: "5d", interval: "30m" },
  "1m": { range: "1mo", interval: "1d" },
  "6m": { range: "6mo", interval: "1wk" },
  "1y": { range: "1y", interval: "1wk" },
};

/* =======================
   Shared helpers
======================= */

/** Total portfolio value in USD at chart index i */
function portfolioValueAt(
  assetCharts: ChartPoint[][],
  assets: Asset[],
  i: number,
  usdThbRate: number,
): number {
  return assetCharts.reduce((sum, chart, idx) => {
    return (
      sum +
      toUSD(chart[i].close!, assets[idx].symbol, usdThbRate) *
        assets[idx].quantity
    );
  }, 0);
}

function buildDataPoints(
  spChart: ChartPoint[],
  assetCharts: ChartPoint[][],
  assets: Asset[],
  usdThbRate: number,
  startIndex = 0,
) {
  const length = Math.min(spChart.length, ...assetCharts.map((c) => c.length));
  const data = [];

  for (let i = startIndex; i < length; i++) {
    data.push({
      time: spChart[i].time,
      portfolioValue: portfolioValueAt(assetCharts, assets, i, usdThbRate),
      sp500Value: spChart[i].close!,
    });
  }

  return data;
}

/* =======================
   fetchChart wrapper (returns flat array)
======================= */

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<ChartPoint[]> {
  const { data } = await fetchYahooChart(symbol, range, interval);
  return data.filter((p) => p.close != null);
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

    const usdThbRate = await fetchUSDTHBRate();

    /* ── 1D: intraday vs previous close ── */
    if (range === "1d") {
      const [[spPrevClose, ...assetPrevCloses], [spChart, ...assetCharts]] =
        await Promise.all([
          Promise.all([
            fetchPreviousClose("^GSPC"),
            ...assets.map((a) => fetchPreviousClose(a.symbol)),
          ]),
          Promise.all([
            fetchChart("^GSPC", "1d", "1m"),
            ...assets.map((a) => fetchChart(a.symbol, "1d", "1m")),
          ]),
        ]);

      const basePortfolio = assetPrevCloses.reduce((sum, price, i) => {
        return (
          sum + toUSD(price, assets[i].symbol, usdThbRate) * assets[i].quantity
        );
      }, 0);

      // Market closed
      if (spChart.length <= 1) {
        return NextResponse.json({
          range,
          base: { portfolio: basePortfolio, sp500: spPrevClose },
          data: [
            {
              time: spChart[0]?.time ?? Math.floor(Date.now() / 1000),
              portfolioValue: basePortfolio,
              sp500Value: spPrevClose,
            },
          ],
        });
      }

      // Market open — first point is prev-close baseline, rest are live
      const data = [
        {
          time: spChart[0].time,
          portfolioValue: basePortfolio,
          sp500Value: spPrevClose,
        },
        ...buildDataPoints(spChart, assetCharts, assets, usdThbRate, 1),
      ];

      return NextResponse.json({
        range,
        base: { portfolio: basePortfolio, sp500: spPrevClose },
        data,
      });
    }

    /* ── 5D / 1M / 6M / 1Y: historical ── */
    const cfg = RANGE_CONFIG[range];

    const [spChart, ...assetCharts] = await Promise.all([
      fetchChart("^GSPC", cfg.range, cfg.interval),
      ...assets.map((a) => fetchChart(a.symbol, cfg.range, cfg.interval)),
    ]);

    const basePortfolio = assetCharts.reduce((sum, chart, i) => {
      return (
        sum +
        toUSD(chart[0].close!, assets[i].symbol, usdThbRate) *
          assets[i].quantity
      );
    }, 0);

    return NextResponse.json({
      range,
      base: { portfolio: basePortfolio, sp500: spChart[0].close! },
      data: buildDataPoints(spChart, assetCharts, assets, usdThbRate),
    });
  } catch (err: any) {
    console.error("compare api error:", err);
    return NextResponse.json(
      { error: err.message || "server error" },
      { status: 500 },
    );
  }
}
