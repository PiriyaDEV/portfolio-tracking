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
  currencyRate: number;
  formattedDate: string;
  getProfitColor: (value: number) => string;
};

export default function FooterPortfolio({
  assets,
  prices,
  currencyRate,
  formattedDate,
  getProfitColor,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!assets) return null;

  // Total cost (what you paid)
  const totalCostUsd = assets.reduce(
    (sum, a) => sum + a.quantity * a.costPerShare,
    0
  );

  // Total current market value (what it's worth now)
  const totalMarketUsd = assets.reduce((sum, asset) => {
    const currentPrice = prices[asset.symbol] ?? 0;
    return sum + currentPrice * asset.quantity;
  }, 0);

  // Profit/Loss
  const totalProfitUsd = totalMarketUsd - totalCostUsd;
  const totalProfitThb = totalProfitUsd * currencyRate;

  const totalProfitPercent =
    totalCostUsd > 0 ? (totalProfitUsd / totalCostUsd) * 100 : 0;

  const totalChangePercent =
    assets.reduce((sum, asset) => {
      const currentPrice = prices[asset.symbol] ?? 0;
      if (currentPrice === 0) return sum;
      const previousClose = asset.costPerShare;
      return sum + ((currentPrice - previousClose) / previousClose) * 100;
    }, 0) / assets.length;

  return (
    <div className="fixed bottom-[52px] left-1/2 -translate-x-1/2 w-full sm:w-[450px] bg-black-lighter">
      <div className="container mx-auto px-4 py-4 text-center">
        {/* Total Value - always visible */}
        <div>
          <div className="font-bold text-[10px] text-gray-300">
            มูลค่าเงินทั้งหมด ({formattedDate})
          </div>
          <div className="font-bold text-[26px] mt-1 flex items-center justify-center gap-2">
            {fNumber(totalMarketUsd * currencyRate)} บาท{" "}
            <HiChevronDown
              onClick={() => setIsOpen(!isOpen)}
              className={`mt-2 !text-[16px] text-gray-300 transition-transform duration-200 ${
                isOpen ? "rotate-180" : "rotate-0"
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

            {/* Holding Profit */}
            <div className="font-bold text-[10px] flex items-center gap-1">
              % กำไรของทรัพย์ที่ถืออยู่ :{" "}
              <span
                className={`flex items-center gap-1 ${getProfitColor(
                  totalProfitUsd
                )}`}
              >
                {totalProfitPercent > 0 ? (
                  <UpIcon className="text-[12px]" />
                ) : totalProfitPercent < 0 ? (
                  <DownIcon className="text-[12px]" />
                ) : null}
                {fNumber(totalProfitPercent)}% (
                {totalProfitPercent > 0 ? "+" : ""}
                {fNumber(totalProfitThb)} บาท)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
