"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { getLogo, getName, fNumber } from "@/app/lib/utils";

/* -------------------- Types -------------------- */

interface Props {
  advancedLevels: Record<string, AdvancedLevels>;
  prices: Record<string, number | null>;
  logos: any;
}

type Signal = "BUY" | "SELL" | "NORMAL";

/* -------------------- Helpers -------------------- */

/**
 * ราคา <= entry → เข้าโซนซื้อ
 */
const isBelowEntry = (
  price?: number | null,
  entry?: number | null,
  percent: number = 0.03
): boolean => {
  if (price == null || entry == null) return false;
  return price <= entry || price <= entry * (1 + percent);
};

/**
 * ราคาเข้าใกล้แนวต้าน (ภายใน ~2%)
 */
const isNearResistance = (
  price?: number | null,
  resistance?: number | null
): boolean => {
  if (price == null || resistance == null) return false;
  return (price - resistance) / resistance >= -0.02;
};

/**
 * หา signal ของหุ้น
 */
const getSignal = (price?: number | null, levels?: AdvancedLevels): Signal => {
  if (!price || !levels) return "NORMAL";

  if (isBelowEntry(price, levels.entry2)) return "BUY";
  if (isBelowEntry(price, levels.entry1)) return "BUY";
  if (isNearResistance(price, levels.resistance)) return "SELL";

  return "NORMAL";
};

/**
 * ranking สำหรับ sort
 */
const getSignalRank = (signal: Signal): number => {
  switch (signal) {
    case "BUY":
      return 0;
    case "SELL":
      return 1;
    default:
      return 2;
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

        const strongBuy = isBelowEntry(price, levels.entry2);
        const buyZone = !strongBuy && isBelowEntry(price, levels.entry1);
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
                {/* Entry */}
                <div className="bg-green-900/40 rounded p-2 grid grid-cols-2 gap-2">
                  <div>จุดซื้อ 1: {fNumber(levels.entry1)}</div>
                  <div>จุดซื้อ 2: {fNumber(levels.entry2)}</div>
                </div>

                {/* Risk */}
                <div className="bg-red-900/40 rounded p-2 grid grid-cols-2 gap-2">
                  <div>จุดตัดขาดทุน: {fNumber(levels.stopLoss)}</div>
                  <div>แนวต้าน: {fNumber(levels.resistance)}</div>
                </div>

                {/* EMA + Trend */}
                {/* <div className="bg-blue-900/30 rounded p-2 grid grid-cols-3 gap-2">
                  <div>EMA20: {fNumber(levels.ema20)}</div>
                  <div>EMA50: {fNumber(levels.ema50)}</div>
                  <div className="font-semibold">
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
                </div> */}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
