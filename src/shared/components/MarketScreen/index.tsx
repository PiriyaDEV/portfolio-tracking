"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { getSignal, getSignalRank } from "@/app/lib/market.logic";
import StockCard from "../StockCard";

interface Props {
  advancedLevels: Record<string, AdvancedLevels>;
  prices: Record<string, number | null>;
}

export default function MarketScreen({ advancedLevels, prices }: Props) {
  const sortedSymbols = Object.keys(advancedLevels)
    .filter((s) => advancedLevels[s]?.currentPrice > 0)
    .sort((a, b) => {
      const sa = getSignal(prices[a], advancedLevels[a]);
      const sb = getSignal(prices[b], advancedLevels[b]);
      return getSignalRank(sa) - getSignalRank(sb);
    });

  return (
    <div className="w-full px-4 mt-4 space-y-3 pb-[70px]">
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
  );
}
