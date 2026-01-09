"use client";

import { getLogo, getName, fNumber } from "@/app/lib/utils";

/* -------------------- Types -------------------- */

export interface TechnicalLevels {
  resistance1: number | null;
  resistance2: number | null;
  support1: number | null;
  support2: number | null;
}

interface Props {
  technicalLevels: Record<string, TechnicalLevels>;
  prices: Record<string, number | null>;
  logos: any;
}

/* -------------------- Helpers -------------------- */

/**
 * Returns true if price is within 3% of support
 */
const isNearSupport = (
  price?: number | null,
  support?: number | null
): boolean => {
  if (price == null || support == null) return false;
  return Math.abs(price - support) / support <= 0.03;
};

/**
 * Returns true if price is within 3% of resistance
 */
const isNearResistance = (
  price?: number | null,
  resistance?: number | null
): boolean => {
  if (price == null || resistance == null) return false;
  return Math.abs(price - resistance) / resistance <= 0.03;
};

/* -------------------- Component -------------------- */

export default function MarketScreen({
  technicalLevels,
  prices,
  logos,
}: Props) {
  const sortedSymbols = Object.keys(technicalLevels).sort((a, b) => {
    const pa = prices[a];
    const pb = prices[b];

    const la = technicalLevels[a];
    const lb = technicalLevels[b];

    const aNearSupport = isNearSupport(pa, la?.support1);
    const bNearSupport = isNearSupport(pb, lb?.support1);

    const aNearResistance = isNearResistance(pa, la?.resistance1);
    const bNearResistance = isNearResistance(pb, lb?.resistance1);

    if (aNearSupport && !bNearSupport) return -1;
    if (!aNearSupport && bNearSupport) return 1;

    if (aNearResistance && !bNearResistance) return -1;
    if (!aNearResistance && bNearResistance) return 1;

    return 0;
  });

  return (
    <div className="w-full px-4 mt-4 space-y-3 pb-[70px]">
      {sortedSymbols.map((symbol) => {
        const levels = technicalLevels[symbol];
        const price = prices[symbol];

        const nearSupport = isNearSupport(price, levels?.support1);
        const nearResistance = isNearResistance(price, levels?.resistance1);

        return (
          <div
            key={symbol}
            className={`
              rounded-lg p-4 grid grid-cols-[auto_1fr] gap-4 border
              ${
                nearSupport
                  ? "bg-green-900/30 border-green-400 shadow-lg"
                  : nearResistance
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

            {/* Data */}
            <div className="flex flex-col gap-2">
              {/* Name + Price */}
              <div className="flex justify-between items-center">
                <div className="font-bold text-[16px]">{getName(symbol)}</div>
                <div className="text-[14px] font-semibold">
                  ราคาปัจจุบัน:{" "}
                  <span className="text-white">{fNumber(price ?? 0)} USD</span>
                </div>
              </div>

              {/* Badges */}
              {nearSupport && (
                <div className="text-green-400 text-[12px] font-semibold">
                  📉 เข้าใกล้แนวรับ
                </div>
              )}

              {nearResistance && (
                <div className="text-red-400 text-[12px] font-semibold">
                  📈 เข้าใกล้แนวต้าน
                </div>
              )}

              {/* Levels */}
              <div className="grid grid-cols-1 gap-3 text-[13px]">
                {/* แนวรับ */}
                <div className="bg-green-900/40 rounded p-2 flex items-center gap-3">
                  <div className="text-green-400 font-semibold">แนวรับ</div>
                  <div>
                    S1: {levels.support1 ? fNumber(levels.support1) : "-"}
                  </div>
                  <div>
                    S2: {levels.support2 ? fNumber(levels.support2) : "-"}
                  </div>
                </div>

                {/* แนวต้าน */}
                <div className="bg-red-900/40 rounded p-2 flex items-center gap-3">
                  <div className="text-red-400 font-semibold">แนวต้าน</div>
                  <div>
                    R1: {levels.resistance1 ? fNumber(levels.resistance1) : "-"}
                  </div>
                  <div>
                    R2: {levels.resistance2 ? fNumber(levels.resistance2) : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
