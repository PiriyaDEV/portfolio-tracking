"use client";

import { useEffect, useMemo, useState } from "react";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName, isThaiStock } from "@/app/lib/utils";
import {
  LineChart,
  Line,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import React from "react";
import {
  FearGreedGauge,
  getFearGreedBg,
  getFearGreedText,
  mapFearGreed,
} from "../FearGreedGauge";
import {
  SkeletonMarketBar,
  SkeletonPulse,
  SkeletonRow,
} from "./components/GraphSkeleton";
import { SortIcon } from "./components/SortIcon";
import { ProfitBadge } from "./components/ProfitBadge";
import { SessionBadge } from "./components/SessionBadge";

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
  market: MarketResponse;
};

type PrePostData = {
  currentPrice: number | null;
  regularMarketPrice: number | null;
  previousClose: number | null;
  session: "pre" | "regular" | "post" | "closed";
  changePercent: number | null;
  prePostChangePercent: number | null;
  latestTimestamp: number | null;
};

type MarketItem = {
  price: number | null;
  changePercent: number | null;
};

type FearGreedItem = {
  value: number | null;
  status: string | null;
};

export const defaultMarketResponse: MarketResponse = {
  sp500: { price: null, changePercent: null },
  gold: { price: null, changePercent: null },
  set: { price: null, changePercent: null },
  btc: { price: null, changePercent: null },
  fearGreed: { value: null, status: "" },
};

export type MarketResponse = {
  sp500: MarketItem;
  gold: MarketItem;
  set: MarketItem;
  btc: MarketItem;
  fearGreed: FearGreedItem;
};

// "none" = default API order
type SortBy = "holding" | "profit" | "none";
export type SortOrder = "asc" | "desc";

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
    key: "btc",
    label: "BTC",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxjVTE3M2v2tGkmuoZKAL7roppVSJuL9IN3w&s",
    type: "price",
  },
  {
    key: "oil",
    label: "OIL",
    img: "https://static.thenounproject.com/png/1053409-200.png",
    type: "price",
  },
  {
    key: "set",
    label: "SET",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRe8tM3-t2BDnm-9vKA-mN5yEQci4cOHUBGrw&s",
    type: "price",
  },
] as const;

/* =======================
   Component
======================= */

export function GraphPrice({
  graphs,
  assets,
  prices,
  previousPrice,
  market,
}: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("none");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFearGreedModal, setShowFearGreedModal] = useState(false);
  const [prePostData, setPrePostData] = useState<Record<string, PrePostData>>(
    {},
  );
  const [isLoadingPrePost, setIsLoadingPrePost] = useState(true);

  const isLoading = !graphs || Object.keys(graphs).length === 0;

  useEffect(() => {
    const usSymbols = assets
      .map((a) => a.symbol)
      .filter((s) => !isThaiStock(s));

    if (!usSymbols.length) {
      setIsLoadingPrePost(false);
      return;
    }

    const fetchPrePost = async () => {
      try {
        const res = await fetch("/api/prepost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: usSymbols }),
        });
        const json = await res.json();
        setPrePostData(json.data ?? {});
      } catch (err) {
        console.error("PrePost fetch failed", err);
      } finally {
        setIsLoadingPrePost(false);
      }
    };

    fetchPrePost();
    const interval = setInterval(fetchPrePost, 60_000);
    return () => clearInterval(interval);
  }, [assets]);

  const getProfitPercent = (symbol: string) => {
    const currentPrice = prices?.[symbol];
    const prevPrice = previousPrice?.[symbol];
    if (!currentPrice || !prevPrice) return 0;
    return ((currentPrice - prevPrice) / prevPrice) * 100;
  };

  const getHoldingValue = (asset: Asset) => asset.quantity * asset.costPerShare;

  const sortedAssets = useMemo(() => {
    if (sortBy === "none") return [...assets];

    const list = [...assets];

    if (sortBy === "holding") {
      return list.sort((a, b) =>
        sortOrder === "desc"
          ? getHoldingValue(b) - getHoldingValue(a)
          : getHoldingValue(a) - getHoldingValue(b),
      );
    }

    return list.sort((a, b) => {
      const pa = getProfitPercent(a.symbol);
      const pb = getProfitPercent(b.symbol);
      return sortOrder === "asc" ? pa - pb : pb - pa;
    });
  }, [assets, prices, previousPrice, sortBy, sortOrder]);

  const handleSortColumn = (col: "holding" | "profit") => {
    if (sortBy !== col) {
      setSortBy(col);
      setSortOrder("desc");
    } else if (sortOrder === "desc") {
      setSortOrder("asc");
    } else {
      setSortBy("none");
      setSortOrder("desc");
    }
  };

  return (
    <div className="mt-[90px] flex flex-col">
      {/* Fear & Greed Modal */}
      {showFearGreedModal && market?.fearGreed?.value !== null && (
        <FearGreedGauge
          value={market.fearGreed.value!}
          onClose={() => setShowFearGreedModal(false)}
        />
      )}

      {/* HEADER */}
      <div
        className="fixed top-[160px] left-1/2 -translate-x-1/2 max-w-[450px] w-full gap-3 py-2 px-3 text-[12px] text-gray-400 bg-black z-[99]"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="mt-[5px] overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {isLoading ? (
            <SkeletonMarketBar />
          ) : (
            market && (
              <div className="flex items-center gap-2.5 min-w-max">
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
                        className="flex items-center gap-2 shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "10px",
                          padding: "5px 10px",
                          backdropFilter: "blur(12px)",
                          boxShadow:
                            "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
                          transition: "background 0.2s",
                        }}
                      >
                        <img
                          src={item.img}
                          alt={item.label}
                          className="w-5 h-5 rounded-full object-cover bg-white"
                          style={{
                            boxShadow: "0 0 0 1px rgba(255,255,255,0.12)",
                          }}
                        />
                        <div
                          className="flex flex-col whitespace-nowrap"
                          style={{ gap: "1px" }}
                        >
                          <span className="text-[12px] font-semibold text-[#f0f0f0] tracking-[0.01em] font-mono">
                            {fNumber(data.price)}
                          </span>
                          <span
                            className={`text-[10px] font-medium tracking-[0.02em] ${
                              isUp ? "!text-emerald-600" : "!text-red-600"
                            }`}
                          >
                            {isUp ? "▲ +" : "▼ "}
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
                      onClick={() => setShowFearGreedModal(true)}
                      className={`flex items-center gap-2 shrink-0 cursor-pointer ${getFearGreedBg(fg.value)}`}
                      style={{
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "10px",
                        padding: "5px 10px",
                        backdropFilter: "blur(12px)",
                        boxShadow:
                          "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
                        transition: "opacity 0.15s",
                      }}
                    >
                      <img
                        src={item.img}
                        alt={item.label}
                        className="w-5 h-5 rounded-full object-cover"
                        style={{
                          boxShadow: "0 0 0 1px rgba(255,255,255,0.12)",
                        }}
                      />
                      <div
                        className="flex flex-col whitespace-nowrap"
                        style={{ gap: "1px" }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#f0f0f0",
                            letterSpacing: "0.01em",
                          }}
                        >
                          กลัว & โลภ
                        </span>
                        <span
                          className={`text-left w-fit capitalize rounded ${getFearGreedText(fg.value)}`}
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {mapFearGreed(fg.value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Column Headers */}
        <div
          className="mt-[15px] grid grid-cols-[2fr_1fr_1fr]"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            paddingBottom: "6px",
          }}
        >
          <div
            onClick={() => handleSortColumn("holding")}
            className="cursor-pointer select-none flex items-center gap-1"
            style={{
              color:
                sortBy === "holding"
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(255,255,255,0.3)",
              transition: "color 0.15s",
            }}
          >
            สินทรัพย์
            <SortIcon
              active={sortBy === "holding"}
              order={sortBy === "holding" ? sortOrder : null}
            />
          </div>

          <div />

          <div
            onClick={() => handleSortColumn("profit")}
            className="text-right cursor-pointer select-none flex justify-end items-center gap-1"
            style={{
              color:
                sortBy === "profit"
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(255,255,255,0.3)",
              transition: "color 0.15s",
            }}
          >
            % กำไร
            <SortIcon
              active={sortBy === "profit"}
              order={sortBy === "profit" ? sortOrder : null}
            />
          </div>
        </div>
      </div>

      {/* SKELETON ROWS */}
      {isLoading &&
        [...Array(5)].map((_, i) => (
          <React.Fragment key={i}>
            <SkeletonRow />
            {i < 4 && (
              <div className="border-b border-white opacity-10 mx-4 my-2" />
            )}
          </React.Fragment>
        ))}

      {/* ASSET ROWS */}
      {!isLoading &&
        market &&
        sortedAssets.map((asset, index) => {
          const symbol = asset.symbol;
          const graph = graphs[symbol];

          if (!graph || graph.data.length <= 1) return null;

          const { data } = graph;

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
              <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 py-2 items-center">
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
                    <div className="font-normal text-gray-400 text-[12px] max-w-[120px] truncate">
                      {graph.shortName}
                    </div>
                  </div>
                </div>

                {/* GRAPH */}
                <div
                  className={`h-[50px] flex items-center w-full pointer-events-none rounded-md ${
                    percentChange > 0
                      ? "bg-gradient-to-b from-green-500/25 via-green-400/10 to-transparent"
                      : percentChange < 0
                        ? "bg-gradient-to-b from-red-500/25 via-red-400/10 to-transparent"
                        : "bg-gradient-to-b from-gray-400/20 to-transparent"
                  }`}
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

                {/* PROFIT — redesigned */}
                <div className="flex flex-col items-end gap-[5px]">
                  <ProfitBadge percentChange={percentChange} />

                  {(() => {
                    const pp = prePostData[symbol];
                    const ppChange = pp?.prePostChangePercent;

                    return (
                      <>
                        {/* SessionBadge */}
                        {!isThaiStock(symbol) && (
                          <>
                            {isLoadingPrePost ? (
                              <SkeletonPulse className="h-[16px] w-[60px] rounded-md" />
                            ) : (
                              pp &&
                              pp.session !== "regular" &&
                              pp.session !== "closed" && (
                                <SessionBadge
                                  session={pp.session}
                                  ppChange={ppChange}
                                />
                              )
                            )}
                          </>
                        )}

                        {/* Price (always show) */}
                        <div
                          className="!text-gray-400"
                          style={{
                            fontSize: "11px",
                            fontVariantNumeric: "tabular-nums",
                            letterSpacing: "0.01em",
                          }}
                        >
                          ราคา:{" "}
                          {fNumber(pp?.regularMarketPrice ?? currentPrice) ??
                            "—"}
                        </div>
                      </>
                    );
                  })()}
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
