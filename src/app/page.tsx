"use client";

import CommonLoading from "@/shared/components/CommonLoading";
import { useEffect, useState } from "react";
import {
  TiChartPieOutline as ChartIcon,
  TiRefresh as RefreshIcon,
} from "react-icons/ti";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
} from "react-icons/fa6";
import { fNumber } from "./lib/utils";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

export default function StockPrice() {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const assets: Asset[] = [
    { symbol: "NVDA", quantity: 5, costPerShare: 272.41 },
    { symbol: "AAPL", quantity: 10, costPerShare: 150 },
  ];

  let mockRes = {
    c: 272.41,
    d: -0.54,
    dp: -0.1978,
    h: 275.96,
    l: 269.6,
    o: 271.05,
    pc: 272.95,
    t: 1763154000,
  };

  async function fetchFinancialData() {
    setIsLoading(true);
    try {
      const results: Record<string, number | null> = {};
      for (const asset of assets) {
        results[asset.symbol] = mockRes.c ?? null;
      }
      setPrices(results);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const toggleExpand = (symbol: string) => {
    setExpanded((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  const totalPortfolioValue = assets.reduce((sum, a) => {
    const p = prices[a.symbol];
    return p ? sum + p * a.quantity : sum;
  }, 0);

  if (isLoading) return <CommonLoading />;

  return (
    <div>
      {/* Refresh Button */}
      <div className="px-4 flex justify-end w-full">
        <RefreshIcon
          className="cursor-pointer text-[30px] mb-4"
          onClick={fetchFinancialData}
        />
      </div>

      <div className="flex flex-wrap w-full">
        {/* Header */}
        <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2">
          <div className="text-[12px] flex items-center text-gray-400">
            {assets.length} สินทรัพย์
          </div>
          <div className="text-[12px] flex justify-end items-center text-gray-400">
            มูลค่า (USD)
          </div>
          <div className="text-[12px] flex justify-end items-center text-gray-400">
            % กำไร
          </div>
        </div>

        {/* Assets */}
        {assets.map((asset) => {
          const currentPrice = prices[asset.symbol];
          const cost = asset.costPerShare * asset.quantity;
          const marketValue =
            currentPrice !== null ? currentPrice * asset.quantity : null;
          const profit = marketValue !== null ? marketValue - cost : 0;
          const profitPercent = profit !== null ? (profit / cost) * 100 : null;

          // Determine color based on profit/loss/break-even
          const profitColor =
            profit === null
              ? "text-gray-500"
              : profit > 0
              ? "text-green-500"
              : profit < 0
              ? "text-red-500"
              : "text-gray-500";

          const isExpanded = !!expanded[asset.symbol];

          return (
            <div key={asset.symbol} className="w-full shadow-sm">
              {/* Top section */}
              <div
                className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer hover:bg-gray-800 transition"
                onClick={() => toggleExpand(asset.symbol)}
              >
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-[16px]">{asset.symbol}</div>
                  <div className="text-[12px] flex items-center gap-1">
                    <ChartIcon />

                    {marketValue && totalPortfolioValue > 0
                      ? `${((marketValue / totalPortfolioValue) * 100).toFixed(
                          2
                        )}%`
                      : "-"}
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <div className="font-bold text-[16px]">
                    {marketValue ? fNumber(marketValue) : "-"}
                  </div>
                  <div className="text-[12px] flex items-center gap-1 text-gray-300">
                    ≈ {marketValue ? fNumber(marketValue / 50) : "-"} USD
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <div
                    className={`font-bold text-[16px] flex items-center gap-1 ${profitColor}`}
                  >
                    {profit > 0 ? (
                      <UpIcon className="text-[12px]" />
                    ) : profit < 0 ? (
                      <DownIcon className="text-[12px]" />
                    ) : null}
                    {profitPercent ? `${profitPercent.toFixed(2)}%` : "0.00 %"}
                  </div>
                  <div
                    className={`text-[12px] flex items-center gap-1 ${profitColor}`}
                  >
                    {profit
                      ? `${profit > 0 ? "+" : ""}${profit.toFixed(2)} USD`
                      : "0.00 USD"}
                  </div>
                </div>
              </div>

              {/* Bottom section (expandable) */}
              {isExpanded && (
                <div className="mt-2 text-[12px] text-gray-300 grid grid-cols-[1fr_1fr] gap-1 bg-black-lighter px-4 py-2">
                  <div>
                    จำนวนหุ้น:{" "}
                    <span className="!text-white">{asset.quantity}</span>
                  </div>
                  <div>
                    ราคาปัจจุบัน:{" "}
                    <span className="!text-white">{currentPrice ?? "-"}</span>
                  </div>
                  <div>
                    ต้นทุนต่อหุ้น:{" "}
                    <span className="!text-white">{asset.costPerShare}</span>
                  </div>
                  <div>
                    ต้นทุนรวม: <span className="!text-white">{cost}</span>
                  </div>
                  <div>
                    กำไร/ขาดทุน:{" "}
                    <span className={profitColor}>
                      {profit !== null
                        ? `${profit > 0 ? "+" : ""}${profit.toFixed(2)}`
                        : "-"}
                    </span>
                  </div>
                  <div>
                    เปอร์เซ็นต์:{" "}
                    <span className={profitColor}>
                      {profitPercent !== null
                        ? `${profit > 0 ? "+" : ""}${profitPercent.toFixed(2)}%`
                        : "-"}
                    </span>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-b border-white opacity-20 mx-4 my-2"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
