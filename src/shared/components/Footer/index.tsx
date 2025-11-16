"use client";

import { fNumber } from "@/app/lib/utils";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
} from "react-icons/fa6";

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
  if (!assets) return null;

  const totalPortfolioValue = assets.reduce(
    (sum, a) => sum + a.quantity * a.costPerShare,
    0
  );

  const totalMarketUsd = assets.reduce((sum, asset) => {
    const currentPrice = prices[asset.symbol] ?? 0;
    return sum + currentPrice * asset.quantity;
  }, 0);

  const totalProfitUsd = totalMarketUsd - totalPortfolioValue;
  const totalProfitThb = totalProfitUsd * currencyRate;

  const totalProfitPercent =
    totalPortfolioValue > 0 ? (totalProfitUsd / totalPortfolioValue) * 100 : 0;

  const totalChangePercent =
    assets.reduce((sum, asset) => {
      const currentPrice = prices[asset.symbol] ?? 0;
      if (currentPrice === 0) return sum;
      const previousClose = asset.costPerShare;
      return sum + ((currentPrice - previousClose) / previousClose) * 100;
    }, 0) / assets.length;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-black-lighter py-5 w-full sm:w-[450px]">
      <div className="container mx-auto px-4 flex flex-col gap-2 text-center">
        {/* Total Value */}
        <div>
          <div className="font-bold text-[12px] text-gray-300">
            มูลค่าเงินทั้งหมด ({formattedDate}) :
          </div>
          <div className="font-bold text-[26px] mt-1">
            {fNumber(totalPortfolioValue * currencyRate)} บาท
          </div>
        </div>

        <div className="border-b border-accent-yellow opacity-40 mx-4 my-2"></div>

        {/* Change & Profit */}
        <div className="flex flex-col items-center gap-2 justify-center">
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
      </div>
    </div>
  );
}
