"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { Asset } from "@/app/lib/interface";
import { getSignal, getSignalRank } from "@/app/lib/market.logic";
import { JSX, useState } from "react";

import {
  FaChartLine,
  FaLayerGroup,
  FaChartBar,
  FaCoins,
  FaNewspaper,
} from "react-icons/fa6";
import SNPCompare from "./components/SNPCompare";
import DividendSummary from "./components/Dividend";
import { GraphPrice } from "./components/GraphPrice";
import StockCard from "./components/StockCard";
import NewsScreen from "../NewsScreen";
import Earning from "./components/Earning";
import { FaCalendarAlt } from "react-icons/fa";

interface Props {
  advancedLevels: Record<string, AdvancedLevels>;
  prices: Record<string, number | null>;
  assets: Asset[];
  dividend: any;
  graphs: any;
  previousPrice: any;
  wishlist: any;
}

type TabKey = "graph" | "support" | "compare" | "dividend" | "news" | "earning";

export default function AnalystScreen({
  advancedLevels,
  prices,
  assets,
  dividend,
  graphs,
  previousPrice,
  wishlist,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("graph");

  const sortedSymbols = Object.keys(advancedLevels)
    .filter((s) => advancedLevels[s]?.currentPrice > 0)
    .sort((a, b) => {
      const sa = getSignal(prices[a], advancedLevels[a]);
      const sb = getSignal(prices[b], advancedLevels[b]);
      return getSignalRank(sa) - getSignalRank(sb);
    });

  const tabs: {
    key: TabKey;
    label: string;
    icon: JSX.Element;
  }[] = [
    {
      key: "graph",
      label: "กราฟ",
      icon: <FaChartLine size={22} />,
    },
    {
      key: "news",
      label: "ข่าว",
      icon: <FaNewspaper size={22} />,
    },
    {
      key: "support",
      label: "แนวรับ",
      icon: <FaLayerGroup size={22} />,
    },
    {
      key: "compare",
      label: "เทียบ S&P",
      icon: <FaChartBar size={22} />,
    },
    {
      key: "earning",
      label: "ไตรมาส",
      icon: <FaCalendarAlt size={22} />,
    },
    {
      key: "dividend",
      label: "ปันผล",
      icon: <FaCoins size={22} />,
    },
  ];

  return (
    <div className="w-full px-4 mt-[35px] pb-[90px]">
      {/* Tabs */}
      <div className="fixed top-[80px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[99] bg-black py-3 border-b border-black-lighter2">
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
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition
                    ${
                      isActive
                        ? "bg-yellow-500 text-white"
                        : "bg-black-lighter2 text-white"
                    }
                  `}
                >
                  {tab.icon}
                </div>

                <span
                  className={`text-xs ${
                    isActive ? "text-yellow-400" : "text-gray-300"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="pt-[90px] space-y-3">
        {activeTab === "support" && (
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

        {activeTab === "compare" && <SNPCompare assets={assets} />}

        {activeTab === "dividend" && <DividendSummary data={dividend} />}

        {activeTab === "graph" && (
          <GraphPrice
            assets={assets}
            graphs={graphs}
            prices={prices}
            previousPrice={previousPrice}
          />
        )}

        {activeTab === "earning" && (
          <Earning wishlist={wishlist} assets={assets} />
        )}

        {activeTab === "news" && <NewsScreen />}
      </div>
    </div>
  );
}
