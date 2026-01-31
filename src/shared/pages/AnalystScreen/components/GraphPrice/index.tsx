"use client";

import { useEffect, useMemo, useState } from "react";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName } from "@/app/lib/utils";
import {
  LineChart,
  Line,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import CommonLoading from "@/shared/components/common/CommonLoading";
import React from "react";

/* =======================
   Types
======================= */

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

type MarketItem = {
  price: number | null;
  changePercent: number | null;
};

type FearGreedItem = {
  value: number | null;
  status: string | null;
};

type MarketResponse = {
  sp500: MarketItem;
  gold: MarketItem;
  set: MarketItem;
  btc: MarketItem;
  fearGreed: FearGreedItem;
};

type SortBy = "holding" | "profit";
type SortOrder = "asc" | "desc";

/* =======================
   Market Items
======================= */

const MARKET_ITEMS = [
  {
    key: "fearGreed",
    label: "กลัว & โลภ",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ98TsJWCyoL6U67OvJhl_xXMle-vnq7LCjmg&s",
    type: "sentiment",
  },
  {
    key: "sp500",
    label: "S&P 500",
    img: "https://cdn-icons-png.flaticon.com/512/3909/3909383.png",
    type: "price",
  },
  {
    key: "gold",
    label: "Gold",
    img: "https://cdn-icons-png.flaticon.com/512/9590/9590147.png",
    type: "price",
  },
  {
    key: "set",
    label: "SET",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRe8tM3-t2BDnm-9vKA-mN5yEQci4cOHUBGrw&s",
    type: "price",
  },
  {
    key: "btc",
    label: "BTC",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxjVTE3M2v2tGkmuoZKAL7roppVSJuL9IN3w&s",
    type: "price",
  },
] as const;

/* =======================
   Helpers
======================= */

function mapFearGreed(value: number) {
  if (value <= 24) return "😱 ตลาดกลัวขั้นสุด";
  if (value <= 44) return "😟 ตลาดกลัว";
  if (value <= 55) return "😐 ตลาดเป็นกลาง";
  if (value <= 74) return "😊 ตลาดโลภ";
  return "🤑 ตลาดโลภขั้นสุด";
}

const getFearGreedBg = (value: number) => {
  if (value <= 24) return "!bg-red-100"; // Extreme Fear 😱
  if (value <= 44) return "!bg-orange-100"; // Fear 😟
  if (value <= 55) return "!bg-gray-100"; // Neutral 😐
  if (value <= 74) return "!bg-green-100"; // Greed 😊
  return "!bg-green-200 animate-pulse"; // Extreme Greed 🤑
};

const getFearGreedText = (value: number) => {
  if (value <= 24) return "!text-red-800";
  if (value <= 44) return "!text-orange-800";
  if (value <= 55) return "!text-gray-700";
  if (value <= 74) return "!text-green-800";
  return "!text-green-900";
};

/* =======================
   Component
======================= */

export function GraphPrice({ graphs, assets, prices, previousPrice }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("holding");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(true);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch("/api/market");
        const json = await res.json();
        setMarket(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMarket(false);
      }
    };

    fetchMarket();
  }, []);

  if (!graphs || Object.keys(graphs).length === 0) return null;

  const getProfitPercent = (symbol: string) => {
    const currentPrice = prices?.[symbol];
    const prevPrice = previousPrice?.[symbol];
    if (!currentPrice || !prevPrice) return 0;
    return ((currentPrice - prevPrice) / prevPrice) * 100;
  };

  const sortedAssets = useMemo(() => {
    const list = [...assets];

    if (sortBy === "holding") {
      return list.sort(
        (a, b) => b.quantity * b.costPerShare - a.quantity * a.costPerShare,
      );
    }

    return list.sort((a, b) => {
      const pa = getProfitPercent(a.symbol);
      const pb = getProfitPercent(b.symbol);
      return sortOrder === "asc" ? pa - pb : pb - pa;
    });
  }, [assets, prices, previousPrice, sortBy, sortOrder]);

  const toggleProfitSort = () => {
    if (sortBy === "holding") {
      setSortBy("profit");
      setSortOrder("desc");
      return;
    }
    if (sortOrder === "desc") {
      setSortOrder("asc");
      return;
    }
    setSortBy("holding");
    setSortOrder("desc");
  };

  return (
    <div className="mt-[70px] flex flex-col">
      {/* HEADER */}
      <div className="fixed top-[173px] left-1/2 -translate-x-1/2 max-w-[450px] w-full gap-3 py-2 px-3 text-[12px] text-gray-400 bg-black z-[99] border-b border-black-lighter2">
        {!loadingMarket && market && (
          <div className="mt-[5px] overflow-x-auto">
            <div className="flex items-center gap-3 min-w-max">
              {MARKET_ITEMS.map((item) => {
                if (item.type === "price") {
                  const data = market[
                    item.key as keyof MarketResponse
                  ] as MarketItem;
                  if (!data?.price) return null;

                  const isUp = (data.changePercent ?? 0) >= 0;

                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-2 bg-white rounded-lg px-3 py-1 shadow-sm shrink-0"
                    >
                      <img
                        src={item.img}
                        alt={item.label}
                        className="w-5 h-5 rounded-full object-cover border border-gray-500"
                      />
                      <div className="flex flex-col text-sm whitespace-nowrap">
                        <span className="font-semibold !text-black">
                          {fNumber(data.price)}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            isUp ? "!text-green-600" : "!text-red-600"
                          }`}
                        >
                          {isUp ? "+" : ""}
                          {fNumber(data.changePercent ?? 0)}%
                        </span>
                      </div>
                    </div>
                  );
                }

                const fg = market.fearGreed;
                if (!fg?.value) return null;

                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-2 bg-white rounded-lg px-3 py-1 shadow-sm shrink-0 ${getFearGreedBg(
                      fg.value,
                    )}`}
                  >
                    <img
                      src={item.img}
                      alt={item.label}
                      className="w-5 h-5 rounded-full object-cover border border-gray-500"
                    />
                    <div className="flex flex-col text-sm whitespace-nowrap">
                      <span className="font-semibold !text-black">
                        Fear & Greed
                      </span>
                      <span
                        className={`text-left w-fit text-xs font-bold !text-white capitalize py-[2px] rounded ${getFearGreedText(
                          fg.value,
                        )}`}
                      >
                        {mapFearGreed(fg.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-[15px] grid grid-cols-[2fr_1fr_1fr]">
          <div>สินทรัพย์</div>
          <div></div>
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
      </div>

      {loadingMarket && (
        <div className="pt-[150px]">
          <CommonLoading isFullScreen={false} />
        </div>
      )}

      {!loadingMarket &&
        sortedAssets.map((asset, index) => {
          const symbol = asset.symbol;
          const graph = graphs[symbol];
          if (!graph || graph.data.length <= 1) return null;

          const currentPrice = prices?.[symbol];
          const prevPrice = previousPrice?.[symbol];

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

          const isLast = index === sortedAssets.length - 1;

          return (
            <React.Fragment key={symbol}>
              <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 py-2">
                {/* LEFT */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                      getLogo(symbol) ? "" : "bg-white"
                    }`}
                    style={{ backgroundImage: `url(${getLogo(symbol)})` }}
                  />
                  <div>
                    <div className="font-bold text-[16px]">
                      {getName(symbol)}
                    </div>
                    <div className="font-normal text-[12px] max-w-[120px] truncate">
                      {graph.shortName}
                    </div>
                  </div>
                </div>

                {/* GRAPH */}
                <div className="w-full pointer-events-none rounded-md">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graph.data}>
                      <YAxis hide />
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
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* PROFIT */}
                <div className="flex flex-col items-end">
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
                  <div className="font-normal text-[12px]">
                    ราคา: {fNumber(currentPrice) ?? "-"}
                  </div>
                </div>
              </div>

              {!isLast && (
                <div className="border-b border-white opacity-10 mx-4 my-2" />
              )}
            </React.Fragment>
          );
        })}
    </div>
  );
}
