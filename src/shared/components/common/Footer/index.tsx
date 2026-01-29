"use client";

import { useState } from "react";
import { fNumber } from "@/app/lib/utils";
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

// Helper function to check if stock is Thai
const isThaiStock = (symbol: string): boolean => {
  return symbol.toUpperCase().endsWith(".BK");
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

  // Profit/Loss in THB
  const totalProfitThb = totalMarketThb - totalCostThb;

  const totalProfitPercent =
    totalCostThb > 0 ? (totalProfitThb / totalCostThb) * 100 : 0;

  const totalPercentChange = (): number => {
    if (!assets || assets.length === 0) return 0;

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

      // Convert to THB if US stock
      totalPreviousValue += isThai ? prevValue : prevValue * currencyRate;
      totalCurrentValue += isThai ? currValue : currValue * currencyRate;
    }

    const percentChange =
      totalPreviousValue > 0
        ? ((totalCurrentValue - totalPreviousValue) / totalPreviousValue) * 100
        : 0;

    return percentChange;
  };

  return (
    <div className="fixed bottom-[52px] left-1/2 -translate-x-1/2 w-full sm:w-[450px] bg-black-lighter">
      <div className="container mx-auto px-4 py-4 text-center">
        {/* Total Value - always visible */}
        <div>
          <div className="font-bold text-[10px] text-gray-300">
            มูลค่าเงินทั้งหมด ({formattedDate})
          </div>
          <div className="font-bold text-[26px] mt-1 flex items-center justify-center gap-2">
            {isNumbersHidden ? "*****" : fNumber(totalMarketThb)} บาท{" "}
            <HiChevronDown
              onClick={() => setIsOpen(!isOpen)}
              className={`mt-2 !text-[16px] text-gray-300 transition-transform duration-200 ${
                !isOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </div>
        </div>

        {/* Collapsible Change & Profit */}
        {isOpen && (
          <div className="mt-3 border-t border-accent-yellow pt-2 flex flex-col items-center gap-2 justify-center">
            {/* Daily Change */}
            <div className="font-bold text-[10px] flex items-center gap-1">
              % เปลี่ยนจากวันก่อน :{" "}
              <span
                className={`flex items-center gap-1 ${getProfitColor(
                  totalPercentChange(),
                )}`}
              >
                {totalPercentChange() > 0 ? (
                  <UpIcon className="text-[12px]" />
                ) : totalPercentChange() < 0 ? (
                  <DownIcon className="text-[12px]" />
                ) : null}
                {fNumber(totalPercentChange())}%
              </span>
            </div>

            {/* Holding Profit */}
            <div className="font-bold text-[10px] flex items-center gap-1">
              % กำไรของทรัพย์ที่ถืออยู่ :{" "}
              <span
                className={`flex items-center gap-1 ${getProfitColor(
                  totalProfitThb,
                )}`}
              >
                {totalProfitPercent > 0 ? (
                  <UpIcon className="text-[12px]" />
                ) : totalProfitPercent < 0 ? (
                  <DownIcon className="text-[12px]" />
                ) : null}
                {fNumber(totalProfitPercent)}% (
                {totalProfitPercent > 0 ? "+" : ""}
                {isNumbersHidden ? "*****" : fNumber(totalProfitThb)} บาท)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
