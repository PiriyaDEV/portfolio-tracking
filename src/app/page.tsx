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
  const isMock = true;
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    fetchFinancialData();
    fetchFxRate();

    const now = new Date();

    // Map month to Thai abbreviation
    const thaiMonths = [
      "ม.ค",
      "ก.พ",
      "มี.ค",
      "เม.ย",
      "พ.ค",
      "มิ.ย",
      "ก.ค",
      "ส.ค",
      "ก.ย",
      "ต.ค",
      "พ.ย",
      "ธ.ค",
    ];

    const day = now.getDate();
    const month = thaiMonths[now.getMonth()];
    const year = (now.getFullYear() + 543) % 100; // Thai Buddhist year short form
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");

    setFormattedDate(`${day} ${month} ${year} ${hours}:${minutes} น.`);
  }, []);

  const assets: Asset[] = [
    { symbol: "NVDA1", quantity: 13, costPerShare: 181.9361 },
    { symbol: "TSLA", quantity: 2.4963855, costPerShare: 391.3258 },
    { symbol: "IONQ", quantity: 6, costPerShare: 42.57 },
    {
      symbol: "BINANCE:BTCUSDT",
      quantity: 0.0031655,
      costPerShare: 97305.11738593,
    },
  ];

  const FINNHUB_API_BASE_URL = "https://finnhub.io/api/v1";
  const API_KEY = "d4c807hr01qudf6h35i0d4c807hr01qudf6h35ig";

  async function fetchFinancialData() {
    setIsLoading(true);

    try {
      const results: Record<string, number | null> = {};
      let res: any = {};

      for (const asset of assets) {
        if (isMock) {
          res = { c: 190.17 };
        } else {
          const url = new URL(`${FINNHUB_API_BASE_URL}/quote`);
          url.searchParams.append("symbol", asset.symbol);
          url.searchParams.append("token", API_KEY);

          const response = await fetch(url.toString());
          if (!response.ok) throw new Error("Fetch error");

          res = await response.json();
        }
        results[asset.symbol] = res.c ?? null;
      }
      setPrices(results);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }

    setTimeout(() => setIsLoading(false), 1000);
  }

  async function fetchFxRate() {
    if (isMock) {
      setCurrencyRate(Number(32.31) ?? 0);
    } else {
      const res = await fetch("/api/usbToThb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`BOT API Error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setCurrencyRate(Number(data.rate) ?? 0);
    }
  }

  function getName(name: string) {
    if (name == "BINANCE:BTCUSDT") {
      return "BTC";
    }
    return name;
  }

  const toggleExpand = (symbol: string) => {
    setExpanded((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  const totalPortfolioValue = assets.reduce(
    (sum, a) => sum + a.quantity * a.costPerShare,
    0
  );

  const renderFooter = () => (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-black-lighter py-5 w-full sm:w-[450px]">
      <div className="container mx-auto px-4 flex items-center justify-between gap-7">
        <div>
          {/* Write this here */}
          <div className="font-bold text-[12px] text-gray-300">
            {/* เปลี่ยนจากวันก่อน  */}
          </div>
          <div className="font-bold text-[12px] text-gray-300">
            {/* กำไรของทรัพย์ที่ถืออยู่  : */}
          </div>
        </div>
        <div>
          <div className="font-bold text-[12px] text-gray-300">
            มูลค่าเงินทั้งหมด ({formattedDate}) :
          </div>
          <div className="font-bold text-[24px]">
            {fNumber(totalPortfolioValue * currencyRate)} บาท
            <span className="ml-2">
              {(() => {
                const total = totalPortfolioValue;
                if (total < 0) return "💀";
                if (total < 500) return "😵‍💫";
                if (total < 1_000) return "😅";
                if (total < 3_000) return "🫠";
                if (total < 5_000) return "🥱";
                if (total < 10_000) return "🤑";
                if (total < 50_000) return "😎";
                if (total < 100_000) return "🤩";
                if (total < 500_000) return "🥳";
                if (total < 1_000_000) return "🚀";
                if (total < 5_000_000) return "🌕";
                if (total < 10_000_000) return "🪐";
                return "💰";
              })()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) return <CommonLoading />;

  return (
    <div>
      {/* Refresh Button */}
      <div className="px-4 flex justify-end w-full mt-[81px]">
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
                  <div className="font-bold text-[16px]">
                    {getName(asset.symbol)}
                  </div>

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
                    ({profit > 0 ? "+" : ""}
                    {fNumber(profit * currencyRate)} บาท)
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

      {renderFooter()}
    </div>
  );
}
