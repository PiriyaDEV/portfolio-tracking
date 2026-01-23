"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { Asset } from "@/app/lib/interface";
import { getSignal, getSignalRank } from "@/app/lib/market.logic";
import SNPCompare from "@/shared/components/SNPCompare";
import StockCard from "@/shared/components/StockCard";
import { useState } from "react";

interface Props {
  advancedLevels: Record<string, AdvancedLevels>;
  prices: Record<string, number | null>;
  assets: Asset[];
}

export default function MarketScreen({
  advancedLevels,
  prices,
  assets,
}: Props) {
  const [activeTab, setActiveTab] = useState<"support" | "compare">("support");
  const sortedSymbols = Object.keys(advancedLevels)
    .filter((s) => advancedLevels[s]?.currentPrice > 0)
    .sort((a, b) => {
      const sa = getSignal(prices[a], advancedLevels[a]);
      const sb = getSignal(prices[b], advancedLevels[b]);
      return getSignalRank(sa) - getSignalRank(sb);
    });

  return (
    <div className="w-full px-4 mt-4 space-y-3 pb-[70px]">
      {/* Tabs mapping */}
      <div className="fixed top-[80px] flex mb-4 gap-2 z-[99] bg-black w-full py-4">
        {[
          { key: "support", label: "แนวรับ" },
          { key: "compare", label: "เทียบพอร์ต กับ S&P500" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded ${
              activeTab === tab.key
                ? "bg-yellow-500 text-black"
                : "bg-black-lighter2 text-white"
            }`}
            onClick={() => {
              setActiveTab(tab.key as "support" | "compare");
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-[50px]">
        {activeTab === "compare" ? (
          <SNPCompare assets={assets} />
        ) : (
          <div className="flex flex-col gap-3">
            {sortedSymbols.map((symbol) => (
              <StockCard
                key={symbol}
                symbol={symbol}
                price={prices[symbol]!}
                levels={advancedLevels[symbol]}
                showAnalyst
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
