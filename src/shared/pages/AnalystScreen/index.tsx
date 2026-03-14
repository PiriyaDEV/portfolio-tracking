"use client";

import { JSX, useState } from "react";
import { Asset } from "@/app/lib/interface";
import { getSignal, getSignalRank } from "@/app/lib/market.logic";
import {
  FaChartLine,
  FaLayerGroup,
  FaChartBar,
  FaNewspaper,
} from "react-icons/fa6";
import { FaCalendarAlt } from "react-icons/fa";
import { isCash } from "@/app/lib/utils";
import { useMarketStore } from "@/store/useMarketStore"; // ← NEW

import SNPCompare from "./components/SNPCompare";
import { GraphPrice } from "./components/GraphPrice";
import StockCard from "./components/StockCard";
import NewsScreen from "../NewsScreen";
import Earning from "./components/Earning";
import StockRecommendScreen from "../CalculateScreen/components/StockRecommand";
import { GraphModal } from "./components/GraphPrice/components/GraphModal";

// Re-export MarketResponse so existing imports still work
export type { MarketResponse } from "./components/GraphPrice";

interface Props {
  assets: Asset[];
  wishlist: any;
  userId: any;
}

type TabKey =
  | "graph"
  | "support"
  | "compare"
  | "recommend"
  | "news"
  | "earning";

export default function AnalystScreen({ assets, wishlist, userId }: Props) {
  // ─── Pull everything from shared store ────────────────────────────────────
  const {
    prices,
    advancedLevels,
    graphs,
    previousPrice,
    currencyRate,
    market,
  } = useMarketStore();

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("graph");

  const sortedSymbols = Object.keys(advancedLevels)
    .filter((symbol) => {
      const level = advancedLevels[symbol];
      return level?.currentPrice > 0 && !isCash(symbol);
    })
    .sort((a, b) => {
      const sa = getSignal(prices[a], advancedLevels[a]);
      const sb = getSignal(prices[b], advancedLevels[b]);
      return getSignalRank(sa) - getSignalRank(sb);
    });

  const tabs: { key: TabKey; label: string; icon: JSX.Element }[] = [
    { key: "graph", label: "กราฟ", icon: <FaChartLine size={22} /> },
    { key: "compare", label: "เทียบ S&P", icon: <FaChartBar size={22} /> },
    { key: "news", label: "ข่าว", icon: <FaNewspaper size={22} /> },
    { key: "support", label: "แนวรับ", icon: <FaLayerGroup size={22} /> },
    { key: "earning", label: "ไตรมาส", icon: <FaCalendarAlt size={22} /> },
    { key: "recommend", label: "แนะนำหุ้น", icon: <FaChartLine size={22} /> },
  ];

  return (
    <div className="w-full px-4 mt-[50px] pb-[90px]">
      {selectedSymbol && (
        <GraphModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          currencyRate={currencyRate}
        />
      )}

      {/* Tabs */}
      <div className="fixed top-[67px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[99] bg-black py-3 border-b border-black-lighter2">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-yellow-500 shadow-[0_0_18px_rgba(234,179,8,0.55)]"
                      : "bg-black-lighter2 text-white hover:bg-white/10"
                  }`}
                >
                  {tab.icon}
                </div>
                <span
                  className={`text-xs ${isActive ? "text-yellow-400" : "text-gray-300"}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="pt-[50px] space-y-3">
        {activeTab === "support" && (
          <div className="flex flex-col gap-3">
            {sortedSymbols.map((symbol) => (
              <StockCard
                key={symbol}
                symbol={symbol}
                price={prices[symbol]!}
                levels={advancedLevels[symbol]}
                onSelect={(sym) => setSelectedSymbol(sym)}
                showAnalyst
              />
            ))}
          </div>
        )}

        {activeTab === "compare" && <SNPCompare assets={assets} />}

        {activeTab === "recommend" && (
          <StockRecommendScreen userId={userId} currencyRate={currencyRate} />
        )}

        {activeTab === "graph" && (
          // GraphPrice ดึงจาก store เอง — ไม่ต้องส่ง props แล้ว
          <GraphPrice assets={assets} market={market!} />
        )}

        {activeTab === "earning" && (
          <Earning wishlist={wishlist} assets={assets} />
        )}

        {activeTab === "news" && <NewsScreen />}
      </div>
    </div>
  );
}
