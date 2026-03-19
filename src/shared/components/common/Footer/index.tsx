"use client";

import { useState } from "react";
import { fNumber, isThaiStock } from "@/app/lib/utils";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
} from "react-icons/fa6";
import { HiChevronDown } from "react-icons/hi2";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type Props = {
  assets: Asset[];
  prices: any;
  previousPrice: any;
  currencyRate: number;
  formattedDate: string;
  getProfitColor: (value: number) => string;
  isNumbersHidden?: boolean;
};

export default function FooterPortfolio({
  assets,
  prices,
  previousPrice,
  currencyRate,
  formattedDate,
  getProfitColor,
  isNumbersHidden = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!assets) return null;

  // Total cost in THB (converting USD stocks to THB)
  const totalCostThb = assets.reduce((sum, a) => {
    const isThai = isThaiStock(a.symbol);
    const cost = a.quantity * a.costPerShare;
    return sum + (isThai ? cost : cost * currencyRate);
  }, 0);

  // Total current market value in THB
  const totalMarketThb = assets.reduce((sum, asset) => {
    const isThai = isThaiStock(asset.symbol);
    const currentPrice = prices[asset.symbol] ?? 0;
    const value = currentPrice * asset.quantity;
    return sum + (isThai ? value : value * currencyRate);
  }, 0);

  // ✅ เช็คว่า prices โหลดครบทุก asset หรือยัง
  const isFullyLoaded =
    assets.every((a) => a.symbol in prices) &&
    totalMarketThb !== 0 &&
    formattedDate !== null;

  // Profit/Loss in THB
  const totalProfitThb = totalMarketThb - totalCostThb;

  const totalProfitPercent =
    totalCostThb > 0 ? (totalProfitThb / totalCostThb) * 100 : 0;

  const totalDailyChange = (): { percent: number; value: number } => {
    if (!assets || assets.length === 0) return { percent: 0, value: 0 };

    let totalPreviousValue = 0;
    let totalCurrentValue = 0;

    for (const asset of assets) {
      const symbol = asset.symbol;
      const quantity = asset.quantity;
      const isThai = isThaiStock(symbol);

      const prevPrice = previousPrice[symbol] ?? 0;
      const currPrice = prices[symbol] ?? 0;

      const prevValue = prevPrice * quantity;
      const currValue = currPrice * quantity;

      totalPreviousValue += isThai ? prevValue : prevValue * currencyRate;
      totalCurrentValue += isThai ? currValue : currValue * currencyRate;
    }

    const percentChange =
      totalPreviousValue > 0
        ? ((totalCurrentValue - totalPreviousValue) / totalPreviousValue) * 100
        : 0;

    return {
      percent: percentChange,
      value: totalCurrentValue - totalPreviousValue,
    };
  };

  const totalPercentChange = (): number => totalDailyChange().percent;

  return (
    <div className="fixed bottom-[52px] left-1/2 -translate-x-1/2 w-full sm:w-[450px] bg-black-lighter shadow-[0_-8px_32px_rgba(0,0,0,0.6)] border-t border-white/[0.05]">
      <div
        className="container mx-auto px-5 pt-4 pb-7 text-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Total Value - always visible */}
        <div>
          <div className="font-medium text-[9px] uppercase text-gray-300">
            มูลค่าเงินทั้งหมด{" "}
            <span className="normal-case tracking-normal opacity-60">
              ({formattedDate})
            </span>
          </div>
          <div className="font-bold text-[27px] mt-1 flex items-center justify-center gap-2 tracking-tight">
            <span className="text-white/90">
              {isNumbersHidden ? (
                <span className="tracking-[0.2em] text-white/20 text-xl">
                  •••••
                </span>
              ) : isFullyLoaded ? (
                fNumber(totalMarketThb)
              ) : (
                <span className="inline-block w-32 h-7 bg-white/10 rounded animate-pulse align-middle" />
              )}
            </span>
            <span className="text-[12px] font-medium text-gray-600 self-end mb-1.5">
              บาท
            </span>
            <HiChevronDown
              className={`self-end mb-1.5 !text-[14px] text-gray-700 hover:text-gray-400 cursor-pointer transition-all duration-300 ${
                !isOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </div>
        </div>

        {/* Collapsible: 3 stats side by side */}
        {isOpen && (
          <div className="mt-2 pt-2 border-t border-accent-yellow/50 flex items-center justify-between gap-2 text-[10px]">
            {/* Daily Change */}
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <span className="text-gray-600">วันนี้</span>
              <span
                className={`flex items-center gap-0.5 font-bold ${getProfitColor(totalDailyChange().percent)}`}
              >
                {isFullyLoaded ? (
                  <>
                    {totalDailyChange().percent > 0 ? (
                      <UpIcon className="text-[9px]" />
                    ) : totalDailyChange().percent < 0 ? (
                      <DownIcon className="text-[9px]" />
                    ) : null}
                    {fNumber(totalDailyChange().percent)}%
                  </>
                ) : (
                  <span className="inline-block w-12 h-3 bg-white/10 rounded animate-pulse" />
                )}
              </span>
              <span className="!text-white/40">
                ({isFullyLoaded && (
                  <>
                    {totalDailyChange().value > 0 ? "+" : ""}
                    {isNumbersHidden
                      ? "•••••"
                      : fNumber(totalDailyChange().value)}
                  </>
                )}) บาท
              </span>
            </div>

            <span className="w-px h-8 bg-white/10 flex-shrink-0" />

            {/* Holding Profit */}
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <span className="text-gray-600">กำไรสะสม</span>
              <span
                className={`flex items-center gap-0.5 font-bold ${getProfitColor(totalProfitThb)}`}
              >
                {isFullyLoaded ? (
                  <>
                    {totalProfitPercent > 0 ? (
                      <UpIcon className="text-[9px]" />
                    ) : totalProfitPercent < 0 ? (
                      <DownIcon className="text-[9px]" />
                    ) : null}
                    {fNumber(totalProfitPercent)}%
                  </>
                ) : (
                  <span className="inline-block w-14 h-3 bg-white/10 rounded animate-pulse" />
                )}
              </span>
              <span className="!text-white/40">
                ({isFullyLoaded && (
                  <>
                    {totalProfitPercent > 0 ? "+" : ""}
                    {isNumbersHidden ? "•••••" : fNumber(totalProfitThb)}
                  </>
                )}) บาท
              </span>
            </div>

            <span className="w-px h-8 bg-white/10 flex-shrink-0" />

            {/* Currency Rate */}
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <div className="flex items-center gap-1">
                <img
                  alt="USD"
                  className="w-3.5 h-3.5 rounded-full object-cover bg-white"
                  src="https://cdn-icons-png.flaticon.com/512/3909/3909383.png"
                />
                <span className="text-gray-600">USD</span>
              </div>
              <span className="text-white/50 font-medium">
                {fNumber(currencyRate)}
              </span>
              <span className="!text-white/40">บาท</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
