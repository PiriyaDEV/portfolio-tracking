import { isThaiStock } from "@/app/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchYahooChart,
  fetchUSDTHBRate,
  fetchPreviousClose,
  ChartPoint,
} from "@/app/lib/yahoo.helpers";
import { getAdvancedLevels } from "../stock/support.function";

/* =======================
   Types
======================= */

interface Asset {
  symbol: string;
  quantity: number;
  costPerShare: number;
}

type Range = "1d" | "5d" | "1m" | "3m" | "6m" | "1y";

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
  "3m": { range: "3mo", interval: "1d" },
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

    /* ── 1D: use getAdvancedLevels (same as main screen) to get intraday data ── */
    if (range === "1d") {
      // getAdvancedLevels already fetches 1d/1m filtered to trading hours,
      // handles futures (GC=F) and other symbols correctly — same as main screen.
      const [spLevels, ...assetLevels] = await Promise.all([
        getAdvancedLevels("^GSPC"),
        ...assets.map((a) => getAdvancedLevels(a.symbol)),
      ]);

      // previousClose is the baseline for each asset
      const basePortfolio = assetLevels.reduce((sum, levels, i) => {
        const prevClose = levels.previousClose ?? levels.currentPrice ?? 0;
        return (
          sum +
          toUSD(prevClose, assets[i].symbol, usdThbRate) * assets[i].quantity
        );
      }, 0);

      const spPrevClose = spLevels.previousClose ?? spLevels.currentPrice ?? 0;

      // Build aligned time series from graphData returned by getAdvancedLevels.
      // Each asset's graphData is already filtered to trading hours.
      // We align by matching timestamps that exist in ALL series.
      const spGraphData = spLevels.graphData; // { time, price }[]

      if (spGraphData.length === 0) {
        // Market closed / no intraday data yet
        return NextResponse.json({
          range,
          base: { portfolio: basePortfolio, sp500: spPrevClose },
          data: [
            {
              time: Math.floor(Date.now() / 1000),
              portfolioValue: basePortfolio,
              sp500Value: spPrevClose,
            },
          ],
        });
      }

      // Build sorted arrays for each asset for forward-fill lookup.
      // Futures like GC=F trade different session hours than equities, so exact
      // timestamp matches with ^GSPC are rare — forward-fill uses the last known
      // price at or before each SP500 tick instead of skipping the tick entirely.
      const assetSortedData = assetLevels.map((levels) =>
        [...levels.graphData].sort((a, b) => a.time - b.time),
      );

      function getPriceAtOrBefore(
        sorted: { time: number; price: number }[],
        t: number,
        fallback: number,
      ): number {
        let result = fallback;
        for (const pt of sorted) {
          if (pt.time <= t) result = pt.price;
          else break;
        }
        return result;
      }

      // Use SP500 timestamps as the spine; forward-fill missing asset prices
      const data: {
        time: number;
        portfolioValue: number;
        sp500Value: number;
      }[] = [];

      for (const spPt of spGraphData) {
        const t = spPt.time;

        const portfolioValue = assets.reduce((sum, asset, i) => {
          const fallback =
            assetLevels[i].previousClose ?? assetLevels[i].currentPrice ?? 0;
          const price = getPriceAtOrBefore(assetSortedData[i], t, fallback);
          return sum + toUSD(price, asset.symbol, usdThbRate) * asset.quantity;
        }, 0);

        data.push({ time: t, portfolioValue, sp500Value: spPt.price });
      }

      // Prepend prev-close baseline as t=0 anchor (same pattern as before)
      const firstTime = spGraphData[0]?.time ?? Math.floor(Date.now() / 1000);
      const fullData = [
        {
          time: firstTime,
          portfolioValue: basePortfolio,
          sp500Value: spPrevClose,
        },
        ...data,
      ];

      return NextResponse.json({
        range,
        base: { portfolio: basePortfolio, sp500: spPrevClose },
        data: fullData,
      });
    }

    /* ── 5D / 1M / 3M / 6M / 1Y: historical ── */
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
