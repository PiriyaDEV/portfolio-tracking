"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import { getLogo, getName, fNumber } from "@/app/lib/utils";

/* -------------------- Types -------------------- */

type AnalystView =
  | "STRONG_BUY"
  | "BUY"
  | "HOLD"
  | "SELL"
  | "STRONG_SELL"
  | "BUY_OR_HOLD" // 🟢🟡 แนวนำซื้อหรือถือต่อ
  | "SELL_OR_HOLD" // 🔴🟡 แนวนำขายหรือถือ
  | "NEUTRAL";

interface Props {
  advancedLevels: Record<string, AdvancedLevels>;
  prices: Record<string, number | null>;
  logos: any;
}

type Signal = "STRONG_BUY" | "BUY" | "SELL" | "NORMAL";

/* -------------------- Helpers -------------------- */

const CLOSE_GAP_THRESHOLD = 3;

const getAnalystView = (r?: AdvancedLevels["recommendation"]): AnalystView => {
  if (!r) return "NEUTRAL";

  const entries = [
    { key: "STRONG_BUY", value: r.strongBuy },
    { key: "BUY", value: r.buy },
    { key: "HOLD", value: r.hold },
    { key: "SELL", value: r.sell },
    { key: "STRONG_SELL", value: r.strongSell },
  ].sort((a, b) => b.value - a.value);

  const top = entries[0];
  const second = entries[1];

  const gap = top.value - second.value;

  // 🟢 กรณีคะแนนใกล้กัน
  if (gap <= CLOSE_GAP_THRESHOLD) {
    if (
      (top.key === "BUY" && second.key === "HOLD") ||
      (top.key === "HOLD" && second.key === "BUY")
    ) {
      return "BUY_OR_HOLD";
    }

    if (
      (top.key === "SELL" && second.key === "HOLD") ||
      (top.key === "HOLD" && second.key === "SELL")
    ) {
      return "SELL_OR_HOLD";
    }
  }

  // 🔥 กรณีชัดเจน
  return top.key as AnalystView;
};

const getAnalystLabel = (view: AnalystView) => {
  switch (view) {
    case "STRONG_BUY":
      return "🟢🔥 แนะนำซื้ออย่างมาก";
    case "BUY":
      return "🟢 แนะนำซื้อ";
    case "BUY_OR_HOLD":
      return "🟢🟡 แนวนำซื้อหรือถือต่อ";
    case "HOLD":
      return "🟡 แนะนำถือ";
    case "SELL_OR_HOLD":
      return "🔴🟡 แนวนำขายหรือถือ";
    case "SELL":
      return "🔴 แนะนำขาย";
    case "STRONG_SELL":
      return "🔴❌ แนะนำขายอย่างมาก";
    default:
      return "➖ ไม่มีมุมมองชัดเจน";
  }
};

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
 * - OR price >= entry2 AND price < entry1
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

  const aboveEntry2ButBelowEntry1 = price >= entry2 && price < entry1;

  return nearEntry1 || aboveEntry2ButBelowEntry1;
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
              <div className="flex items-center gap-2">
                {/* Analyst Recommendation */}
                {levels.recommendation && (
                  <div className="text-[12px] font-semibold text-gray-200">
                    นักวิเคราะห์:{" "}
                    <span className="ml-1">
                      {getAnalystLabel(getAnalystView(levels.recommendation))}
                    </span>
                  </div>
                )}

                /

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
