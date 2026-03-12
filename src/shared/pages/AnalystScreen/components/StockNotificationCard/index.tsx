import { getLogo, getName } from "@/app/lib/utils";
import { Toggle } from "@/shared/components/common/Toggle";
import { StockNotifSetting } from "@/shared/components/modal/NotificationModal";

interface AdvancedLevel {
  entry1?: number;
  entry2?: number;
  shortName?: string;
  currentPrice?: number;
  [key: string]: any;
}

// ─── Extracted card component ──────────────────────────────────────────────
export function StockNotificationCard({
  s,
  advancedLevels,
  errors,
  updateSetting,
  isWishlist = false,
}: {
  s: StockNotifSetting;
  advancedLevels: Record<string, AdvancedLevel>;
  errors: Record<string, string>;
  updateSetting: (symbol: string, patch: Partial<StockNotifSetting>) => void;
  isWishlist?: boolean;
}) {
  const logoUrl = getLogo(s.symbol);
  const levels = advancedLevels[s.symbol];
  const shortName = levels?.shortName ?? s.symbol;
  const entry1 = levels?.entry1;
  const entry2 = levels?.entry2;
  const currentPrice = levels?.currentPrice;

  return (
    <div
      className={`rounded-xl border transition-colors p-4 space-y-3 ${
        s.enabled
          ? "border-accent-yellow/20 bg-black"
          : "border-accent-yellow/10 bg-black"
      }`}
    >
      {/* Symbol row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full bg-cover bg-center border border-white/10 shrink-0 ${logoUrl ? "" : "bg-white"}`}
            style={{ backgroundImage: `url(${logoUrl})` }}
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-[13px]">
                {getName(s.symbol)}
              </span>
              {isWishlist && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-yellow/10 text-accent-yellow/70 border border-accent-yellow/20 font-medium">
                  Wishlist
                </span>
              )}
            </div>
            <span className="text-gray-400 text-[11px]">{shortName}</span>
          </div>
        </div>

        {/* Right side: current price + toggle */}
        <div className="flex items-center gap-3">
          {currentPrice != null && (
            <div className="text-right">
              <p className="text-[9px] text-gray-500 leading-none mb-0.5">
                ราคาปัจจุบัน
              </p>
              <p className="text-white font-semibold text-[12px] leading-none">
                {currentPrice.toFixed(2)}
              </p>
            </div>
          )}
          <Toggle
            enabled={s.enabled}
            onToggle={() =>
              updateSetting(s.symbol, {
                enabled: !s.enabled,
                type: null,
                targetPrice: "",
              })
            }
          />
        </div>
      </div>

      {s.enabled && (
        <div className="space-y-2.5 pt-1">
          <div className="flex gap-1.5">
            <button
              onClick={() =>
                updateSetting(s.symbol, { type: "support1", targetPrice: "" })
              }
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                s.type === "support1"
                  ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/40"
                  : "bg-transparent text-gray-300 border-white/10 hover:border-white/20"
              }`}
            >
              แนวรับ 1
              {entry1 != null && (
                <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                  {entry1.toFixed(2)}
                </span>
              )}
            </button>
            <button
              onClick={() =>
                updateSetting(s.symbol, { type: "support2", targetPrice: "" })
              }
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                s.type === "support2"
                  ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/40"
                  : "bg-transparent text-gray-300 border-white/10 hover:border-white/20"
              }`}
            >
              แนวรับ 2
              {entry2 != null && (
                <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                  {entry2.toFixed(2)}
                </span>
              )}
            </button>
            <button
              onClick={() => updateSetting(s.symbol, { type: "price" })}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                s.type === "price"
                  ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/40"
                  : "bg-transparent text-gray-300 border-white/10 hover:border-white/20"
              }`}
            >
              ราคาที่กำหนด
            </button>
          </div>

          {s.type === "price" && (
            <input
              type="number"
              placeholder="กรอกราคาเป้าหมาย"
              value={s.targetPrice}
              onChange={(e) =>
                updateSetting(s.symbol, { targetPrice: e.target.value })
              }
              className="w-full bg-black border border-accent-yellow/30 rounded-lg px-3 py-2 text-white text-[12px] placeholder-gray-600 focus:outline-none focus:border-accent-yellow/60 transition-colors"
            />
          )}

          {errors[s.symbol] && (
            <p className="text-red-400 text-[11px]">{errors[s.symbol]}</p>
          )}
        </div>
      )}
    </div>
  );
}
