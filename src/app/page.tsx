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
  const [currencyRate, setCurrencyRate] = useState<number>(0);

  const assets: Asset[] = [
    { symbol: "NVDA", quantity: 13, costPerShare: 181.9361 },
    { symbol: "TSLA", quantity: 2.4963855, costPerShare: 391.3258 },
    { symbol: "IONQ", quantity: 6, costPerShare: 42.57 },
  ];

  let mockRes = { c: 190.17 };

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

    setTimeout(() => setIsLoading(false), 1000);
  }

  async function fetchFxRate() {
    // const res = await fetch("/api/usbToThb", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    // });
    // if (!res.ok) {
    //   throw new Error(`BOT API Error: ${res.status} ${res.statusText}`);
    // }
    // const data = await res.json();
    // setCurrencyRate(Number(data.rate) ?? 0);
    // console.log("data", data);
    setCurrencyRate(Number(32.31) ?? 0);
  }

  useEffect(() => {
    fetchFinancialData();
    fetchFxRate();
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
          onClick={() => {
            fetchFinancialData();
            fetchFxRate();
          }}
        />
      </div>

      <div className="flex flex-wrap w-full">
        {/* Header */}
        <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2">
          <div className="text-[12px] text-gray-400">
            {assets.length} สินทรัพย์
          </div>
          <div className="text-[12px] text-gray-400 text-right">
            มูลค่า (THB)
          </div>
          <div className="text-[12px] text-gray-400 text-right">% กำไร</div>
        </div>

        {assets.map((asset) => {
          const currentPrice = prices[asset.symbol];
          const cost = asset.costPerShare * asset.quantity;
          const marketValueUsd =
            currentPrice !== null ? currentPrice * asset.quantity : 0;
          const marketValueThb = marketValueUsd * currencyRate;

          const profit = marketValueUsd - cost;
          const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

          const profitColor =
            profit > 0
              ? "text-green-500"
              : profit < 0
              ? "text-red-500"
              : "text-gray-500";

          const isExpanded = !!expanded[asset.symbol];

          return (
            <div key={asset.symbol} className="w-full shadow-sm">
              {/* Top row */}
              <div
                className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer hover:bg-gray-800"
                onClick={() => toggleExpand(asset.symbol)}
              >
                {/* Left column */}
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-[16px]">{asset.symbol}</div>

                  <div className="text-[12px] flex items-center gap-1">
                    <ChartIcon />
                    {totalPortfolioValue > 0
                      ? `${fNumber(
                          (marketValueUsd / totalPortfolioValue) * 100
                        )}%`
                      : "0.00%"}
                  </div>
                </div>

                {/* Middle column */}
                <div className="flex flex-col items-end whitespace-nowrap">
                  <div className="font-bold text-[16px]">
                    {fNumber(marketValueThb)} THB
                  </div>
                  <div className="text-[12px] text-gray-300">
                    ≈ {fNumber(marketValueUsd)} USD
                  </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col items-end">
                  <div
                    className={`font-bold text-[16px] flex items-center gap-1 ${profitColor}`}
                  >
                    {profit > 0 ? (
                      <UpIcon className="text-[12px]" />
                    ) : profit < 0 ? (
                      <DownIcon className="text-[12px]" />
                    ) : null}
                    {fNumber(profitPercent)}%
                  </div>

                  <div className={`text-[12px] ${profitColor}`}>
                    ({profit > 0 ? "+" : ""}{fNumber(profit * currencyRate)} บาท)
                  </div>
                </div>
              </div>

              {/* Expanded bottom section */}
              {isExpanded && (
                <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
                  <div>
                    จำนวนหุ้น:{" "}
                    <span className="text-white">
                      {fNumber(asset.quantity, { decimalNumber: 7 })}
                    </span>
                  </div>
                  <div>
                    ราคาปัจจุบัน:{" "}
                    <span className="text-white">
                      {currentPrice ? fNumber(currentPrice) : "0.00"}
                    </span>
                  </div>
                  <div>
                    ต้นทุนต่อหุ้น:{" "}
                    <span className="text-white">
                      {fNumber(asset.costPerShare)}
                    </span>
                  </div>
                  <div>
                    ต้นทุนรวม:{" "}
                    <span className="text-white">{fNumber(cost)}</span>
                  </div>
                </div>
              )}

              <div className="border-b border-accent-yellow opacity-40 mx-4 my-2"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
