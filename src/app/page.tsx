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
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [currencyRate, setCurrencyRate] = useState<number>(0);
  const isMock = true;
  const [formattedDate, setFormattedDate] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }

    const now = new Date();
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
    const year = (now.getFullYear() + 543) % 100;
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    setFormattedDate(`${day} ${month} ${year} ${hours}:${minutes} น.`);
  }, [isLoggedIn]);

  let assets: Asset[] = [
    { symbol: "AAPL", quantity: 13, costPerShare: 181.9361 },
    { symbol: "TSLA", quantity: 2.4963855, costPerShare: 391.3258 },
    { symbol: "IONQ", quantity: 6, costPerShare: 42.57 },
    {
      symbol: "BINANCE:BTCUSDT",
      quantity: 0.0031655,
      costPerShare: 97305.11738593,
    },
  ];

  const defaultStockLogo =
    "https://png.pngtree.com/png-vector/20190331/ourmid/pngtree-growth-icon-vector--glyph-or-solid-style-icon-stock-png-image_876941.jpg";
  const defaultCryptoLogo =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png";

  function getLogo(symbol: string): string {
    if (symbol === "BINANCE:BTCUSDT") {
      return defaultCryptoLogo;
    }

    const logo = logos?.[symbol];

    return logo ?? defaultStockLogo;
  }

  function handleLogin() {
    const correctPassword = "1234";
    if (password === correctPassword) {
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("รหัสผ่านไม่ถูกต้อง");
    }
  }

  async function loadData() {
    setIsLoading(true);

    try {
      // Run both promises in parallel
      await Promise.all([fetchFinancialData(), fetchFxRate()]);

      // Wait 1 second before turning off loader
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Call this on initial load or button click
  useEffect(() => {
    loadData();
  }, []);

  async function fetchFinancialData() {
    try {
      let data: any;

      if (!isMock) {
        const res = await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assets, isMock }),
        });

        if (!res.ok) throw new Error("Failed to fetch API");

        data = await res.json();
      } else {
        // Mock data directly
        const mockPrices: Record<string, number> = {};
        const validAssets: Asset[] = [];

        for (const asset of assets) {
          mockPrices[asset.symbol] = 190.17;
          validAssets.push(asset);
        }

        data = { prices: mockPrices, assets: validAssets };
      }

      console.log("logo", data.logos);

      setPrices(data.prices);
      setLogos(data.logos);
      assets = data.assets;
      return data;
    } catch (error) {
      console.error(error);
      return { prices: {}, assets: [] };
    }
  }

  async function fetchFxRate() {
    if (isMock) {
      setCurrencyRate(Number(32.31) ?? 0);
    } else {
      const res = await fetch("/api/rate", {
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

  const totalChangePercent =
    assets.reduce((sum, asset) => {
      const currentPrice = prices[asset.symbol] ?? 0;
      if (currentPrice === 0) return sum;
      const res = isMock ? { pc: asset.costPerShare } : undefined;
      const previousClose = res?.pc ?? asset.costPerShare;
      return sum + ((currentPrice - previousClose) / previousClose) * 100;
    }, 0) / assets.length;

  // คำนวณกำไร/ขาดทุนรวมของพอร์ต
  const totalCostUsd = assets.reduce(
    (sum, asset) => sum + asset.quantity * asset.costPerShare,
    0
  );

  const totalMarketUsd = assets.reduce((sum, asset) => {
    const currentPrice = prices[asset.symbol] ?? 0;
    return sum + currentPrice * asset.quantity;
  }, 0);

  const totalProfitUsd = totalMarketUsd - totalCostUsd;
  const totalProfitThb = totalProfitUsd * currencyRate;
  const totalProfitPercent =
    totalCostUsd > 0 ? (totalProfitUsd / totalCostUsd) * 100 : 0;

  function getProfitColor(profit: number): string {
    if (profit > 0) return "!text-green-500";
    if (profit < 0) return "!text-red-500";
    return "!text-gray-500";
  }

  const renderFooter = () => (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-black-lighter py-5 w-full sm:w-[450px]">
      <div className="container mx-auto px-4 flex flex-col gap-2 text-center">
        <div>
          <div className="font-bold text-[12px] text-gray-300">
            มูลค่าเงินทั้งหมด ({formattedDate}) :
          </div>
          <div className="font-bold text-[26px] mt-1">
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

        <div className="border-b border-accent-yellow opacity-40 mx-4 my-2"></div>

        <div className="flex flex-col items-center gap-2 justify-center">
          <div className="font-bold text-[10px] flex items-center gap-1">
            % เปลี่ยนจากวันก่อน :{" "}
            <span
              className={`flex items-center gap-1 ${getProfitColor(
                totalChangePercent
              )}`}
            >
              {totalChangePercent > 0 ? (
                <UpIcon className="text-[12px]" />
              ) : totalChangePercent < 0 ? (
                <DownIcon className="text-[12px]" />
              ) : null}
              {fNumber(totalChangePercent)}%
            </span>
          </div>

          <div className="font-bold text-[10px] flex items-center gap-1">
            % กำไรของทรัพย์ที่ถืออยู่ :{" "}
            <span
              className={`flex items-center gap-1 ${getProfitColor(
                totalChangePercent
              )}`}
            >
              {totalChangePercent > 0 ? (
                <UpIcon className="text-[12px]" />
              ) : totalChangePercent < 0 ? (
                <DownIcon className="text-[12px]" />
              ) : null}
              {fNumber(totalProfitPercent)}% (
              {totalProfitPercent > 0 ? "+" : ""} {fNumber(totalProfitThb)} บาท)
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <div className="bg-black-lighter p-6 rounded-lg w-[300px] flex flex-col gap-4">
          <h2 className="text-white text-xl font-bold text-center">Login</h2>
          <input
            type="password"
            placeholder="Enter password"
            className="p-2 rounded bg-white !text-black border border-accent-yellow"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button
            className="bg-accent-yellow text-white p-2 rounded"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <CommonLoading />;

  return (
    <div className="mt-[81px] mb-[172px]">
      {/* Refresh Button */}
      <div className="px-4 flex justify-end w-full ">
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

          const profitColor = getProfitColor(profit);

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
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                        getLogo(asset.symbol) ? "" : "bg-white"
                      }`}
                      style={{
                        backgroundImage: getLogo(asset.symbol)
                          ? `url(${getLogo(asset.symbol)})`
                          : "none",
                      }}
                    />
                    <div className="font-bold text-[16px]">
                      {getName(asset.symbol)}
                    </div>
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
