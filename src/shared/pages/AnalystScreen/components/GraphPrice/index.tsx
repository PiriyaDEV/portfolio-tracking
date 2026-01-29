"use client";

import { useMemo, useState } from "react";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName } from "@/app/lib/utils";
import {
  LineChart,
  Line,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type GraphPoint = {
  time: number;
  price: number;
};

type GraphData = {
  base: number;
  shortName: string;
  data: GraphPoint[];
};

type Props = {
  graphs: Record<string, GraphData>;
  assets: Asset[];
  prices: any;
  previousPrice: any;
};

type SortBy = "holding" | "profit";
type SortOrder = "asc" | "desc";

export function GraphPrice({ graphs, assets, prices, previousPrice }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("holding");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  if (!graphs || Object.keys(graphs).length === 0) return null;

  /** =======================
   * Helpers
   ======================= */

  const getProfitPercent = (symbol: string) => {
    const currentPrice = prices?.[symbol];
    const prevPrice = previousPrice?.[symbol];

    if (!currentPrice || !prevPrice) return 0;

    return ((currentPrice - prevPrice) / prevPrice) * 100;
  };

  /** =======================
   * Sorting logic (3 states)
   ======================= */
  const sortedAssets = useMemo(() => {
    const list = [...assets];

    // DEFAULT: sort by holding value
    if (sortBy === "holding") {
      return list.sort(
        (a, b) => b.quantity * b.costPerShare - a.quantity * a.costPerShare,
      );
    }

    // PROFIT sort
    return list.sort((a, b) => {
      const pa = getProfitPercent(a.symbol);
      const pb = getProfitPercent(b.symbol);

      return sortOrder === "asc" ? pa - pb : pb - pa;
    });
  }, [assets, prices, previousPrice, sortBy, sortOrder]);

  /** =======================
   * Toggle handler
   ======================= */
  const toggleProfitSort = () => {
    // 1️⃣ holding → profit desc
    if (sortBy === "holding") {
      setSortBy("profit");
      setSortOrder("desc");
      return;
    }

    // 2️⃣ profit desc → profit asc
    if (sortOrder === "desc") {
      setSortOrder("asc");
      return;
    }

    // 3️⃣ profit asc → holding (no sort)
    setSortBy("holding");
    setSortOrder("desc");
  };

  return (
    <div className="flex flex-col divide-y divide-black-lighter2">
      {/* HEADER */}
      <div className="fixed top-[173px] left-1/2 -translate-x-1/2 max-w-[450px] w-full grid grid-cols-[2fr_1fr_1fr] gap-3 py-2 px-3 text-[12px] text-gray-400 bg-black z-[99] border-b border-black-lighter2">
        <div>สินทรัพย์</div>
        <div></div>

        {/* CLICKABLE PROFIT HEADER */}
        <div
          onClick={toggleProfitSort}
          className="text-right cursor-pointer select-none flex justify-end gap-1"
        >
          % กำไร
          {sortBy === "profit" && (
            <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {sortedAssets.map((asset) => {
        const symbol = asset.symbol;
        const graph = graphs[symbol];
        if (!graph || graph.data.length <= 1) return null;

        const { data } = graph;
        const currentPrice = prices?.[symbol];
        const prevPrice = previousPrice?.[symbol];

        // Calculate percent change from previous close (market open to current)
        const percentChange =
          prevPrice && currentPrice
            ? ((currentPrice - prevPrice) / prevPrice) * 100
            : 0;

        const color =
          percentChange > 0
            ? "#22c55e"
            : percentChange < 0
              ? "#ef4444"
              : "#999";

        return (
          <div
            key={symbol}
            className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 py-2"
          >
            {/* LEFT */}
            <div className="flex items-center gap-2">
              <div
                className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                  getLogo(symbol) ? "" : "bg-white"
                }`}
                style={{ backgroundImage: `url(${getLogo(symbol)})` }}
              />
              <div>
                <div className="font-bold text-[16px]">{getName(symbol)}</div>
                <div className="font-normal text-[12px] max-w-[120px] truncate">
                  {graph.shortName}
                </div>
              </div>
            </div>

            {/* GRAPH */}
            <div
              className={`w-full pointer-events-none rounded-md
                ${
                  percentChange > 0
                    ? "bg-gradient-to-b from-green-500/25 via-green-400/10 to-transparent"
                    : percentChange < 0
                      ? "bg-gradient-to-b from-red-500/25 via-red-400/10 to-transparent"
                      : "bg-gradient-to-b from-gray-400/20 to-transparent"
                }
              `}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                >
                  <YAxis
                    hide
                    domain={[
                      (min: number) => min * 0.995,
                      (max: number) => max * 1.005,
                    ]}
                  />
                  <ReferenceLine
                    y={prevPrice || 0}
                    stroke="#777"
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={color}
                    strokeWidth={1}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    strokeLinecap="round"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* PROFIT */}
            <div className="flex flex-col gap-2 items-end">
              <div
                className={`font-bold text-[16px] text-white px-2 py-1 rounded ${
                  percentChange > 0
                    ? "bg-green-600"
                    : percentChange < 0
                      ? "bg-red-600"
                      : "bg-gray-600"
                }`}
              >
                {percentChange > 0 && "+"}
                {percentChange.toFixed(2)}%
              </div>

              <div className="font-normal text-[12px] truncate text-end">
                ราคา: {fNumber(currentPrice) ?? "-"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
