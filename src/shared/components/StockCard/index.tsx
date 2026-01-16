"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { getLogo, getName, fNumber } from "@/app/lib/utils";
import {
  isStrongBuy,
  isNormalBuy,
  isNearResistance,
  getAnalystLabel,
  getAnalystView,
} from "../../../app/lib/market.logic";
import { FaMapPin, FaThumbtack } from "react-icons/fa6";

interface Props {
  symbol: string;
  price: number;
  levels: AdvancedLevels;
  pinned?: boolean;
  onTogglePin?: (symbol: string) => void;
  showAnalyst?: boolean;
}

export default function StockCard({
  symbol,
  price,
  levels,
  pinned = false,
  onTogglePin,
  showAnalyst = false,
}: Props) {
  const strongBuy = isStrongBuy(price, levels.entry2);
  const buyZone = isNormalBuy(price, levels.entry1, levels.entry2);
  const takeProfit = isNearResistance(price, levels.resistance);

  const percentChange =
    levels.previousClose > 0
      ? ((levels.currentPrice - levels.previousClose) / levels.previousClose) *
        100
      : 0;

  const isUp = percentChange > 0;
  const isDown = percentChange < 0;

  return (
    <div
      className={`
        relative rounded-lg p-4 grid grid-cols-[auto_1fr] gap-4 border
        ${
          strongBuy
            ? "bg-green-900/40 border-green-400 shadow-lg"
            : buyZone
            ? "bg-green-900/25 border-green-300 shadow-md"
            : takeProfit
            ? "bg-red-900/30 border-red-400 shadow-lg"
            : "bg-black-lighter border-transparent"
        }
      `}
    >
      {/* Logo */}
      <div
        className="w-[40px] h-[40px] rounded-full bg-cover bg-center bg-white"
        style={{
          backgroundImage: `url(${getLogo(symbol)})`,
        }}
      />

      {/* Content */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="font-bold text-[16px]">{getName(symbol)}</div>

            <div
              className={`text-[13px] font-semibold ${
                isUp
                  ? "text-green-400"
                  : isDown
                  ? "text-red-400"
                  : "text-gray-300"
              }`}
            >
              ({isUp && "+"}
              {percentChange.toFixed(2)}%)
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[14px] font-semibold">
              ราคา: <span className="text-white">{fNumber(price)} USD</span>
            </div>

            {/* 📌 Pin */}
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(symbol)}
                title="Pin to wishlist"
              >
                {pinned ? (
                  <FaThumbtack className="!text-accent-yellow" />
                ) : (
                  <FaThumbtack />
                )}
              </button>
            )}
          </div>
        </div>

        {strongBuy && (
          <div className="text-green-400 text-[12px] font-semibold">
            🟢🔥 จุดที่ต้องซื้อ (STRONG BUY)
          </div>
        )}
        {buyZone && (
          <div className="text-green-300 text-[12px] font-semibold">
            🟢👀 โซนที่น่าสนใจในการซื้อ
          </div>
        )}
        {takeProfit && (
          <div className="text-red-400 text-[12px] font-semibold">
            🔴⚠️ เข้าใกล้แนวต้าน (TAKE PROFIT)
          </div>
        )}

        {showAnalyst && levels.recommendation && (
          <div className="text-[12px] font-semibold text-gray-200">
            นักวิเคราะห์:{" "}
            {getAnalystLabel(getAnalystView(levels.recommendation))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 text-[13px]">
          <div className="bg-green-900/40 rounded p-2 grid grid-cols-2 gap-2">
            <div>จุดซื้อ 1: {fNumber(levels.entry1)}</div>
            <div>จุดซื้อ 2: {fNumber(levels.entry2)}</div>
          </div>

          <div className="bg-red-900/40 rounded p-2 grid grid-cols-2 gap-2">
            <div>จุดตัดขาดทุน: {fNumber(levels.stopLoss)}</div>
            <div>แนวต้าน: {fNumber(levels.resistance)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
