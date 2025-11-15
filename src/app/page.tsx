"use client";

import CommonLoading from "@/shared/components/CommonLoading";
import { useEffect, useState } from "react";
import {
  TiChartPieOutline as ChartIcon,
  TiRefresh as RefreshIcon,
} from "react-icons/ti";
import { FaArrowTrendUp as UpIcon } from "react-icons/fa6";
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

  const FINNHUB_API_BASE_URL = "https://finnhub.io/api/v1";
  const API_KEY = "d4c807hr01qudf6h35i0d4c807hr01qudf6h35ig";

  // Your assets
  const assets: Asset[] = [
    { symbol: "NVDA", quantity: 5, costPerShare: 400 },
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
      const results: Record<string, number> = {};

      for (const asset of assets) {
        // const url = new URL(`${FINNHUB_API_BASE_URL}/quote`);
        // url.searchParams.append("symbol", asset.symbol);
        // url.searchParams.append("token", API_KEY);

        // const response = await fetch(url.toString());
        // if (!response.ok) throw new Error("Fetch error");

        // const data = await response.json();

        // Finnhub returns current price in "c"
        results[asset.symbol] = mockRes.c ?? null;
      }

      setPrices(results);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }

    setIsLoading(false);
  }

  // Load data on first render
  useEffect(() => {
    fetchFinancialData();
  }, []);

  const toggleExpand = (symbol: string) => {
    setExpanded((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  if (isLoading) return <CommonLoading />;

  return (
    <div>
      <div className="px-4 flex justify-end w-full">
        <RefreshIcon
          className="cursor-pointer text-[30px] mb-4"
          onClick={fetchFinancialData}
        />
      </div>

      <div className="flex flex-wrap w-full">
        <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2">
          <div className="text-[12px] flex items-center text-gray-400">4 สินทรัพย์</div>
          <div className="text-[12px] flex justify-end items-center text-gray-400">
            มูลค่า (บาท)
          </div>
          <div className="text-[12px] flex justify-end items-center text-gray-400">
            % กำไร
          </div>
        </div>
        {assets.map((asset) => {
          const currentPrice = prices[asset.symbol];
          const cost = asset.costPerShare * asset.quantity;
          const marketValue =
            currentPrice !== null ? currentPrice * asset.quantity : null;
          const profit = marketValue !== null ? marketValue - cost : null;
          const profitPercent = profit !== null ? (profit / cost) * 100 : null;
          const isProfit = profit !== null && profit > 0;

          const isExpanded = !!expanded[asset.symbol];

          return (
            <div key={asset.symbol} className="w-full shadow-sm">
              {/* Top section (clickable) */}
              <div
                className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer hover:bg-gray-800 transition"
                onClick={() => toggleExpand(asset.symbol)}
              >
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-[16px]">{asset.symbol}</div>
                  <div className="text-[12px] flex items-center gap-1">
                    <ChartIcon />
                    44.43%
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <div className="font-bold text-[16px]">{fNumber(800000)}</div>
                  <div className="text-[12px] flex items-center gap-1 text-gray-300">
                    ≈ {fNumber(20)} USD
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <div className="font-bold text-[16px] flex items-center gap-1">
                    <UpIcon className="text-[12px]" />
                    44.43%
                  </div>
                  <div className="text-[12px] flex items-center gap-1">
                    (+{fNumber(200)} THB)
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
                    ราคาปัจจุบัน (USD):{" "}
                    <span className="!text-white">{currentPrice ?? "-"}</span>
                  </div>
                  <div>
                    ต้นทุนต่อหุ้น (USD):{" "}
                    <span className="!text-white">{asset.costPerShare}</span>
                  </div>
                  <div>
                    ต้นทุนรวม (USD): <span className="!text-white">{cost}</span>
                  </div>
                  <div>
                    กำไร/ขาดทุน:{" "}
                    <span
                      className={isProfit ? "text-green-500" : "text-red-500"}
                    >
                      {profit !== null
                        ? `${isProfit ? "+" : ""}${profit.toFixed(2)}`
                        : "-"}
                    </span>
                  </div>
                  <div>
                    เปอร์เซ็นต์:{" "}
                    <span
                      className={isProfit ? "text-green-500" : "text-red-500"}
                    >
                      {profitPercent !== null
                        ? `${isProfit ? "+" : ""}${profitPercent.toFixed(2)}%`
                        : "-"}
                    </span>
                  </div>
                </div>
              )}

              {/* Partial divider */}
              <div className="mx-auto border-b border-white opacity-20 mx-4 my-2"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
