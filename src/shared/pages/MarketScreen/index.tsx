"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { getSignal, getSignalRank } from "@/app/lib/market.logic";
import SNPCompare from "@/shared/components/SNPCompare";
import StockCard from "@/shared/components/StockCard";
import { useState } from "react";

interface Props {
  advancedLevels: Record<string, AdvancedLevels>;
  prices: Record<string, number | null>;
}

export default function MarketScreen({ advancedLevels, prices }: Props) {
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
      <div className="flex mb-4 gap-2">
        {[
          { key: "support", label: "แนวรับ" },
          { key: "compare", label: "เทียบกำไร กับ Index" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded ${
              activeTab === tab.key
                ? "bg-yellow-500 text-black"
                : "bg-gray-800 text-white"
            }`}
            onClick={() => {
              setActiveTab(tab.key as "support" | "compare");
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "compare" ? (
        <SNPCompare />
      ) : (
        <>
          {sortedSymbols.map((symbol) => (
            <StockCard
              key={symbol}
              symbol={symbol}
              price={prices[symbol]!}
              levels={advancedLevels[symbol]}
              showAnalyst
            />
          ))}
        </>
      )}
    </div>
  );
}
