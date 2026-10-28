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
import { isStrongBuy, isNormalBuy, isNearResistance } from "@/app/lib/market.logic";

// Re-export MarketResponse so existing imports still work
export type { MarketResponse } from "./components/GraphPrice";

/* =======================
   SupportTabContent Component with Filter Pills
======================= */
type FilterType = "all" | "strong-buy" | "buy" | "avoid";

function SupportTabContent({
  sortedSymbols,
  prices,
  advancedLevels,
  setSelectedSymbol,
}: {
  sortedSymbols: string[];
  prices: Record<string, number | null>;
  advancedLevels: Record<string, any>;
  setSelectedSymbol: (symbol: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredSymbols = sortedSymbols.filter((symbol) => {
    if (activeFilter === "all") return true;

    const price = prices[symbol];
    const levels = advancedLevels[symbol];

    const strongBuy = isStrongBuy(price, levels.entry2);
    const buyZone = isNormalBuy(price, levels.entry1, levels.entry2);
    const takeProfit = isNearResistance(price, levels.resistance);

    if (activeFilter === "strong-buy") return strongBuy;
    if (activeFilter === "buy") return buyZone && !strongBuy;
    if (activeFilter === "avoid") return takeProfit;

    return true;
  });

  const filters: { key: FilterType; label: string; emoji: string }[] = [
    { key: "all", label: "ทั้งหมด", emoji: "📊" },
    { key: "strong-buy", label: "ควรซื้อ", emoji: "✅" },
    { key: "buy", label: "ซื้อได้", emoji: "🟢" },
    { key: "avoid", label: "ห้ามซื้อ / ขายได้", emoji: "🔴" },
  ];

  return (
    <>
      {/* Filter Pills */}
      <div className="sticky top-[160px] z-10 bg-black py-3 border-b border-white/[0.06] -mx-4 px-4 mb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium
                  whitespace-nowrap shrink-0 transition-all duration-200
                  ${
                    isActive
                      ? "bg-accent-yellow text-black shadow-[0_0_12px_rgba(255,200,0,0.35)]"
                      : "bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white/90"
                  }
                `}
              >
                <span>{filter.emoji}</span>
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Cards */}
      <div className="flex flex-col gap-3">
        {filteredSymbols.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-sm">
            ไม่พบหุ้นในหมวดนี้
          </div>
        ) : (
          filteredSymbols.map((symbol) => (
            <StockCard
              key={symbol}
              symbol={symbol}
              price={prices[symbol]!}
              levels={advancedLevels[symbol]}
              onSelect={(sym) => setSelectedSymbol(sym)}
              showAnalyst
            />
          ))
        )}
      </div>
    </>
  );
}

interface Props {
  assets: Asset[];
  wishlist: any;
  userId: any;
  isFoldableLayout?: boolean;
  onSelectSymbol?: (symbol: string) => void;
}

type TabKey =
  | "graph"
  | "support"
  | "compare"
  | "recommend"
  | "news"
  | "earning";

type AnalystTab = { key: TabKey; label: string; icon: JSX.Element };

function AnalystTabs({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: AnalystTab[];
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
}) {
  return (
    <div className="analyst-tabs-grid grid gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-[11px] font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-xs ${
              isActive
                ? "border-amber-300/30 bg-accent-yellow/15 text-accent-yellow"
                : "border-surface-border bg-black-lighter text-gray-400 hover:bg-black-lighter2"
            }`}
          >
            <span className="shrink-0 text-sm">{tab.icon}</span>
            <span className="min-w-0 truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AnalystScreen({ assets, wishlist, userId, isFoldableLayout = false, onSelectSymbol }: Props) {
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
    { key: "support", label: "แนะนำ", icon: <FaLayerGroup size={22} /> },
    { key: "earning", label: "ไตรมาส", icon: <FaCalendarAlt size={22} /> },
    { key: "recommend", label: "แนะนำหุ้น", icon: <FaChartLine size={22} /> },
  ];

  return (
    <div className="analyst-screen-container w-full px-4 pb-[90px]">
      {selectedSymbol && !isFoldableLayout && (
        <GraphModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          currencyRate={currencyRate}
        />
      )}

      {/* One sticky header keeps the tab bar and graph market strip in sync. */}
      {activeTab !== "graph" && (
        <div className="analyst-sticky-header sticky top-[67px] z-[99] -mx-4 border-b border-surface-border bg-black px-4 py-2">
          <AnalystTabs
            tabs={tabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />
        </div>
      )}

      {/* Content */}
      <div className="analyst-screen-content space-y-3">
        {activeTab === "support" && (
          <SupportTabContent
            sortedSymbols={sortedSymbols}
            prices={prices}
            advancedLevels={advancedLevels}
            setSelectedSymbol={(symbol) => isFoldableLayout ? onSelectSymbol?.(symbol) : setSelectedSymbol(symbol)}
          />
        )}

        {activeTab === "compare" && <SNPCompare assets={assets} />}

        {activeTab === "recommend" && (
          <StockRecommendScreen userId={userId} currencyRate={currencyRate} />
        )}

        {activeTab === "graph" && (
          // GraphPrice ดึงจาก store เอง — ไม่ต้องส่ง props แล้ว
          <GraphPrice
            assets={assets}
            market={market!}
            isFoldableLayout={isFoldableLayout}
            onSelectSymbol={onSelectSymbol}
            header={
              <AnalystTabs
                tabs={tabs}
                activeTab={activeTab}
                onSelect={setActiveTab}
              />
            }
          />
        )}

        {activeTab === "earning" && (
          <Earning wishlist={wishlist} assets={assets} />
        )}

        {activeTab === "news" && <NewsScreen assets={assets}/>}
      </div>
    </div>
  );
}
