"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { getLogo, getName, fNumber } from "@/app/lib/utils";

/* -------------------- Types -------------------- */

interface Props {
  advancedLevels: Record<string, AdvancedLevels>;
  prices: Record<string, number | null>;
  logos: any;
}

type Signal = "STRONG_BUY" | "BUY" | "SELL" | "NORMAL";

/* -------------------- Helpers -------------------- */

/**
 * STRONG BUY:
 * price < entry2 (support 2 broken)
 */
const isStrongBuy = (
  price?: number | null,
  entry2?: number | null
): boolean => {
  if (price == null || entry2 == null) return false;
  return price < entry2;
};

/**
 * NORMAL BUY:
 * - price near entry1 (±1%)
 * - AND price >= entry2
 */
const isNormalBuy = (
  price?: number | null,
  entry1?: number | null,
  entry2?: number | null,
  percent: number = 0.01
): boolean => {
  if (price == null || entry1 == null || entry2 == null) return false;

  const nearEntry1 =
    price >= entry1 * (1 - percent) && price <= entry1 * (1 + percent);

  const aboveEntry2 = price >= entry2;

  return nearEntry1 && aboveEntry2;
};

/**
 * ราคาเข้าใกล้แนวต้าน (~2.5%)
 */
const isNearResistance = (
  price?: number | null,
  resistance?: number | null
): boolean => {
  if (price == null || resistance == null) return false;
  return (price - resistance) / resistance >= -0.015;
};

/**
 * หา signal ของหุ้น
 */
const getSignal = (price?: number | null, levels?: AdvancedLevels): Signal => {
  if (price == null || !levels) return "NORMAL";

  if (isStrongBuy(price, levels.entry2)) return "STRONG_BUY";
  if (isNormalBuy(price, levels.entry1, levels.entry2)) return "BUY";
  if (isNearResistance(price, levels.resistance)) return "SELL";

  return "NORMAL";
};

/**
 * ranking สำหรับ sort
 */
const getSignalRank = (signal: Signal): number => {
  switch (signal) {
    case "STRONG_BUY":
      return 0;
    case "BUY":
      return 1;
    case "SELL":
      return 2;
    default:
      return 3;
  }
};

/* -------------------- Component -------------------- */

export default function MarketScreen({ advancedLevels, prices, logos }: Props) {
  const sortedSymbols = Object.keys(advancedLevels)
    .filter((symbol) => advancedLevels[symbol]?.currentPrice > 0)
    .sort((a, b) => {
      const signalA = getSignal(prices[a], advancedLevels[a]);
      const signalB = getSignal(prices[b], advancedLevels[b]);

      return getSignalRank(signalA) - getSignalRank(signalB);
    });

  return (
    <div className="w-full px-4 mt-4 space-y-3 pb-[70px]">
      {sortedSymbols.map((symbol) => {
        const levels = advancedLevels[symbol];
        const price = prices[symbol];

        const strongBuy = isStrongBuy(price, levels.entry2);
        const buyZone = isNormalBuy(price, levels.entry1, levels.entry2);
        const takeProfit = isNearResistance(price, levels.resistance);

        return (
          <div
            key={symbol}
            className={`
              rounded-lg p-4 grid grid-cols-[auto_1fr] gap-4 border
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
                backgroundImage: `url(${getLogo(symbol, logos)})`,
              }}
            />

            {/* Content */}
            <div className="flex flex-col gap-2">
              {/* Name + Price */}
              <div className="flex justify-between items-center">
                <div className="font-bold text-[16px]">{getName(symbol)}</div>
                <div className="text-[14px] font-semibold">
                  ราคา:{" "}
                  <span className="text-white">{fNumber(price ?? 0)} USD</span>
                </div>
              </div>

              {/* Signal */}
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

              {/* Trend */}
              <div className="font-semibold text-[12px]">
                แนวโน้ม:{" "}
                <span
                  className={
                    levels.trend === "UP"
                      ? "text-green-400"
                      : levels.trend === "DOWN"
                      ? "text-red-400"
                      : "text-gray-300"
                  }
                >
                  {levels.trend === "UP" && "📈 ขาขึ้น"}
                  {levels.trend === "DOWN" && "📉 ขาลง"}
                  {levels.trend === "SIDEWAYS" && "➖ แกว่งตัว"}
                </span>
              </div>

              {/* Levels */}
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
      })}
    </div>
  );
}
