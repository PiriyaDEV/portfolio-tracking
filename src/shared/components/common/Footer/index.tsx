"use client";

import { useState, useMemo } from "react";
import { isCash, isThaiStock } from "@/app/lib/utils";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
} from "react-icons/fa6";
import { HiChevronDown } from "react-icons/hi2";
import { AnimatedNumber } from "../AnimatedNumber";

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

  // ✅ Total cost (THB) — exclude cash/PVD assets (profit is always 0)
  const totalCostThb = useMemo(() => {
    return assets.reduce((sum, a) => {
      if (isCash(a.symbol)) return sum; // skip cash assets
      const isThai = isThaiStock(a.symbol);
      const cost = a.quantity * a.costPerShare;
      return sum + (isThai ? cost : cost * currencyRate);
    }, 0);
  }, [assets, currencyRate]);

  // ✅ Total market value (THB) — exclude cash/PVD assets from profit calc
  const totalMarketThbForProfit = useMemo(() => {
    return assets.reduce((sum, asset) => {
      if (isCash(asset.symbol)) return sum; // skip cash assets
      const isThai = isThaiStock(asset.symbol);
      const currentPrice = prices[asset.symbol] ?? 0;
      const value = currentPrice * asset.quantity;
      return sum + (isThai ? value : value * currencyRate);
    }, 0);
  }, [assets, prices, currencyRate]);

  // ✅ Total market value (THB) — all assets including cash (for display)
  const totalMarketThb = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const isThai = isThaiStock(asset.symbol);
      const currentPrice = prices[asset.symbol] ?? 0;
      const value = currentPrice * asset.quantity;
      return sum + (isThai ? value : value * currencyRate);
    }, 0);
  }, [assets, prices, currencyRate]);

  // ✅ Fully loaded check
  const isFullyLoaded = useMemo(() => {
    return (
      assets.every((a) => a.symbol in prices) &&
      totalMarketThb !== 0 &&
      formattedDate !== null
    );
  }, [assets, prices, totalMarketThb, formattedDate]);

  // ✅ Profit (exclude cash assets)
  const totalProfitThb = totalMarketThbForProfit - totalCostThb;
  const totalProfitPercent =
    totalCostThb > 0 ? (totalProfitThb / totalCostThb) * 100 : 0;

  // ✅ Daily change (compute ONCE)
  const daily = useMemo(() => {
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

    const percent =
      totalPreviousValue > 0
        ? ((totalCurrentValue - totalPreviousValue) / totalPreviousValue) * 100
        : 0;

    return {
      percent,
      value: totalCurrentValue - totalPreviousValue,
    };
  }, [assets, prices, previousPrice, currencyRate]);

  return (
    <div className="app-portfolio-footer w-full rounded-2xl border border-surface-border bg-black-lighter shadow-sm">
      <div
        className="px-4 py-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* TOTAL VALUE */}
        <div>
          <div className="font-medium text-[10px] uppercase tracking-[0.12em] text-gray-500">
            มูลค่าเงินทั้งหมด{" "}
            <span className="normal-case tracking-normal opacity-60">
              ({formattedDate})
            </span>
          </div>

          <div className="mt-1 flex items-baseline gap-2 font-bold text-[28px] tracking-tight">
            <span className="text-white/90">
              {isNumbersHidden ? (
                <span className="tracking-[0.2em] text-white/20 text-xl">
                  •••••
                </span>
              ) : isFullyLoaded ? (
                <AnimatedNumber value={totalMarketThb} decimals={2} />
              ) : (
                <span className="inline-block w-32 h-7 bg-white/10 rounded animate-pulse" />
              )}
            </span>

            <span className="text-[12px] font-medium text-gray-500">
              บาท
            </span>

            <HiChevronDown
              className={`ml-auto text-[14px] text-gray-500 hover:text-gray-700 cursor-pointer transition-all duration-300 ${
                !isOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </div>
        </div>

        {/* DETAILS */}
        {isOpen && (
          <div className="mt-3 grid grid-cols-3 items-start gap-2 border-t border-surface-border pt-3 text-[10px]">
            {/* DAILY */}
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="text-gray-500">วันนี้</span>

              <span
                className={`flex items-center gap-0.5 font-bold ${getProfitColor(
                  daily.percent,
                )}`}
              >
                {isFullyLoaded ? (
                  <>
                    {daily.percent > 0 && <UpIcon className="text-[9px]" />}
                    {daily.percent < 0 && <DownIcon className="text-[9px]" />}

                    <AnimatedNumber
                      value={daily.percent}
                      decimals={2}
                      suffix="%"
                    />
                  </>
                ) : (
                  <span className="inline-block w-12 h-3 bg-white/10 rounded animate-pulse" />
                )}
              </span>

              <span className="!text-white/40">
                (
                {isFullyLoaded && (
                  <>
                    <AnimatedNumber
                      value={daily.value}
                      decimals={2}
                      prefix={daily.value > 0 ? "+" : ""}
                      masked={isNumbersHidden}
                    />
                  </>
                )}
                ) บาท
              </span>
            </div>

            {/* PROFIT */}
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="text-gray-500">กำไรสะสม</span>

              <span
                className={`flex items-center gap-0.5 font-bold ${getProfitColor(
                  totalProfitThb,
                )}`}
              >
                {isFullyLoaded ? (
                  <>
                    {totalProfitPercent > 0 && (
                      <UpIcon className="text-[9px]" />
                    )}
                    {totalProfitPercent < 0 && (
                      <DownIcon className="text-[9px]" />
                    )}

                    <AnimatedNumber
                      value={totalProfitPercent}
                      decimals={2}
                      suffix="%"
                    />
                  </>
                ) : (
                  <span className="inline-block w-14 h-3 bg-white/10 rounded animate-pulse" />
                )}
              </span>

              <span className="!text-white/40">
                (
                {isFullyLoaded && (
                  <>
                    <AnimatedNumber
                      value={totalProfitThb}
                      decimals={2}
                      prefix={totalProfitThb > 0 ? "+" : ""}
                      masked={isNumbersHidden}
                    />
                  </>
                )}
                ) บาท
              </span>
            </div>

            {/* USD RATE */}
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <div className="flex items-center gap-1">
                <img
                  alt="USD"
                  className="w-3.5 h-3.5 rounded-full object-cover bg-white"
                  src="https://cdn-icons-png.flaticon.com/512/3909/3909383.png"
                />
                <span className="text-gray-500">USD</span>
              </div>

              <span className="text-gray-700 font-medium">
                <AnimatedNumber value={currencyRate} decimals={2} />
              </span>

              <span className="!text-white/40">บาท</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
