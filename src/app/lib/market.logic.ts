import { AdvancedLevels } from "@/app/api/stock/support.function";

/* -------------------- Types -------------------- */

export type AnalystView =
  | "STRONG_BUY"
  | "BUY"
  | "HOLD"
  | "SELL"
  | "STRONG_SELL"
  | "BUY_OR_HOLD"
  | "SELL_OR_HOLD"
  | "NEUTRAL";

export type Signal = "STRONG_BUY" | "BUY" | "SELL" | "NORMAL";

/* -------------------- Constants -------------------- */

export const CLOSE_GAP_THRESHOLD = 3;

/* -------------------- Analyst -------------------- */

export const getAnalystView = (
  r?: AdvancedLevels["recommendation"]
): AnalystView => {
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

  if (gap <= CLOSE_GAP_THRESHOLD) {
    if (
      (top.key === "BUY" && second.key === "HOLD") ||
      (top.key === "HOLD" && second.key === "BUY")
    )
      return "BUY_OR_HOLD";

    if (
      (top.key === "SELL" && second.key === "HOLD") ||
      (top.key === "HOLD" && second.key === "SELL")
    )
      return "SELL_OR_HOLD";
  }

  return top.key as AnalystView;
};

export const getAnalystLabel = (view: AnalystView) => {
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

/* -------------------- Price Logic -------------------- */

export const isStrongBuy = (price?: number | null, entry2?: number | null) =>
  price != null && entry2 != null && price < entry2;

export const isNormalBuy = (
  price?: number | null,
  entry1?: number | null,
  entry2?: number | null,
  percent = 0.01
) => {
  if (price == null || entry1 == null || entry2 == null) return false;

  const nearEntry1 =
    price >= entry1 * (1 - percent) && price <= entry1 * (1 + percent);

  const aboveEntry2ButBelowEntry1 = price >= entry2 && price < entry1;

  return nearEntry1 || aboveEntry2ButBelowEntry1;
};

export const isNearResistance = (
  price?: number | null,
  resistance?: number | null
) =>
  price != null &&
  resistance != null &&
  (price - resistance) / resistance >= -0.015;

/* -------------------- Signal -------------------- */

export const getSignal = (
  price?: number | null,
  levels?: AdvancedLevels
): Signal => {
  if (!levels || price == null) return "NORMAL";
  if (isStrongBuy(price, levels.entry2)) return "STRONG_BUY";
  if (isNormalBuy(price, levels.entry1, levels.entry2)) return "BUY";
  if (isNearResistance(price, levels.resistance)) return "SELL";
  return "NORMAL";
};

export const getSignalRank = (signal: Signal) => {
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
