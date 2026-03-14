"use client";

import { getLogo, getName } from "@/app/lib/utils";
import CommonLoading from "@/shared/components/common/CommonLoading";
import { useEffect, useMemo, useState } from "react";
import { StockDetailModal } from "../GraphPrice/components/GraphModal";
import { useMarketStore } from "@/store/useMarketStore";

/* =======================
   Types
======================= */

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type UiEarning = {
  symbol: string;
  company: string;
  reportDate: string;
  announceTime: string;
  epsEstimate?: number;
};

/* =======================
   Date Utils (Thai)
======================= */

const TH_DAYS = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];

const DAY_COLORS: Record<number, string> = {
  0: "text-red-400",
  1: "text-yellow-400",
  2: "text-pink-400",
  3: "text-green-400",
  4: "text-orange-400",
  5: "text-blue-400",
  6: "text-purple-400",
};

const DAY_GLOW: Record<number, string> = {
  0: "shadow-red-500/20",
  1: "shadow-yellow-500/20",
  2: "shadow-pink-500/20",
  3: "shadow-green-500/20",
  4: "shadow-orange-500/20",
  5: "shadow-blue-500/20",
  6: "shadow-purple-500/20",
};

const formatThaiFullDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${TH_DAYS[d.getDay()]}ที่ ${d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  })}`;
};

const isToday = (dateStr: string) => {
  const d = new Date(dateStr);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
};

const isPast = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

const isFuture = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d > today;
};

const isWithin15Days = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();

  const from = new Date(today);
  from.setDate(today.getDate() - 15);
  from.setHours(0, 0, 0, 0);

  const to = new Date(today);
  to.setDate(today.getDate() + 15);
  to.setHours(23, 59, 59, 999);

  return d >= from && d <= to;
};

/* =======================
   Badge Component
======================= */

const Badge = ({
  children,
  gradient,
  pulse = false,
}: {
  children: React.ReactNode;
  gradient: string;
  pulse?: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r ${gradient} !text-white text-xs font-bold rounded-full shadow-lg ${
      pulse ? "animate-pulse" : ""
    }`}
    style={{ letterSpacing: "0.02em" }}
  >
    {children}
  </span>
);

/* =======================
   EPS Explain
======================= */

const EpsExplain = ({
  eps,
  isWishlist,
}: {
  eps?: number;
  isWishlist: boolean;
}) => {
  if (eps === undefined || eps === null) {
    return (
      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-600"></span>
        📊 ยังไม่มีตัวเลข EPS คาดการณ์
      </div>
    );
  }

  if (eps >= 5) {
    return (
      <div className="text-xs text-emerald-400 mt-2 font-bold flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
        🚀 คาดว่าดีมาก (EPS +{eps})
      </div>
    );
  }

  if (eps >= 0.3) {
    return (
      <div className="text-xs text-green-400 mt-2 font-bold flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]"></span>
        📈 คาดว่าดี (EPS +{eps})
      </div>
    );
  }

  if (eps > -0.3 && eps < 0.3) {
    return (
      <div className="text-xs text-yellow-400 mt-2 font-bold flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15]"></span>
        😐 คาดว่าเฉยๆ (EPS {eps})
      </div>
    );
  }

  if (eps > -5) {
    return (
      <div className="text-xs text-orange-400 mt-2 font-bold flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#fb923c]"></span>
        📉 คาดว่าแย่ (EPS {eps})
      </div>
    );
  }

  return (
    <div className="text-xs text-red-400 mt-2 font-bold flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_#f87171]"></span>
      💀 คาดว่าแย่มาก (EPS {eps})
    </div>
  );
};

/* =======================
   Page
======================= */

export default function EarningsPage({
  wishlist = [],
  assets = [],
}: {
  wishlist: string[];
  assets: Asset[];
}) {
  const [data, setData] = useState<UiEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const { currencyRate, graphs } = useMarketStore();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  /* ===== merge wishlist + assets ===== */
  const mergedAssets = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => set.add(a.symbol));
    wishlist.forEach((s) => set.add(s));
    return Array.from(set).map((symbol) => ({ symbol }));
  }, [assets, wishlist]);

  /* ===== fetch ===== */
  useEffect(() => {
    if (!mergedAssets.length) {
      setLoading(false);
      return;
    }

    fetch("/api/earning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: mergedAssets }),
    })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [mergedAssets]);

  /* ===== group by date (±15 days) ===== */
  const grouped = useMemo(() => {
    const map: Record<string, UiEarning[]> = {};

    data.forEach((e) => {
      if (!isWithin15Days(e.reportDate)) return;
      map[e.reportDate] = map[e.reportDate] || [];
      map[e.reportDate].push(e);
    });

    return map;
  }, [data]);

  /* ===== split sections ===== */
  const sections = useMemo(() => {
    const today: string[] = [];
    const future: string[] = [];
    const past: string[] = [];

    Object.keys(grouped).forEach((date) => {
      if (isToday(date)) today.push(date);
      else if (isFuture(date)) future.push(date);
      else past.push(date);
    });

    return {
      today,
      future: future.sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      ),
      past: past.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
    };
  }, [grouped]);

  if (loading) {
    return (
      <div className="pt-[150px]">
        <CommonLoading isFullScreen={false} />
      </div>
    );
  }

  const renderSection = (title: string, icon: string, dates: string[]) => {
    if (!dates.length) return null;

    return (
      <div className="mb-14">
        {/* Section Header */}
        <h2 className="text-xl font-bold mb-5 flex items-center gap-2.5">
          <span className="text-2xl">{icon}</span>
          <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {title}
          </span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-400">
            {dates.reduce((acc, d) => acc + grouped[d].length, 0)} รายการ
          </span>
        </h2>

        {dates.map((date) => {
          const dayIdx = new Date(date).getDay();
          const past = isPast(date);

          return (
            <div key={date} className="mb-5">
              {/* Date Row */}
              <div
                className={`flex items-center gap-3 text-base font-semibold mb-3 ${
                  past ? "text-gray-600" : DAY_COLORS[dayIdx]
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    past ? "bg-gray-700" : "bg-current opacity-80"
                  }`}
                ></span>
                {formatThaiFullDate(date)}

                {isToday(date) && (
                  <Badge gradient="from-yellow-400 to-orange-500" pulse>
                    🟡 วันนี้
                  </Badge>
                )}
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3">
                {grouped[date].map((e, i) => {
                  const isWishlist = wishlist.includes(e.symbol);
                  const glowClass = past ? "" : DAY_GLOW[dayIdx];

                  return (
                    <div
                      key={i}
                      className={`
                        relative border rounded-2xl p-4 overflow-hidden !text-white
                        transition-all duration-200
                        ${
                          past
                            ? "bg-[#0d0d0d] border-white/5 !text-white"
                            : `bg-gradient-to-br from-[#141414] to-[#0f0f0f]
                               border-white/10 !text-white
                               hover:border-white/20 hover:shadow-xl hover:shadow-black/40
                               ${glowClass}`
                        }
                      `}
                    >
                      {/* Subtle top shimmer line */}
                      {!past && (
                        <div
                          className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent`}
                        />
                      )}

                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div
                          className="flex items-center gap-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedSymbol(e.symbol);
                          }}
                        >
                          <div
                            className={`
                              w-9 h-9 rounded-full bg-cover bg-center flex-shrink-0
                              border-2 ${past ? "border-white/5" : "border-white/15"}
                              ${getLogo(e.symbol) ? "" : "bg-white/10"}
                              ${!past ? "shadow-md" : ""}
                            `}
                            style={{
                              backgroundImage: `url(${getLogo(e.symbol)})`,
                            }}
                          />
                          <div className="flex flex-col gap-1">
                            <div
                              className={`font-bold text-[15px] tracking-wide ${
                                past ? "text-white/60" : "text-white"
                              }`}
                            >
                              {getName(e.symbol)}
                            </div>

                            <div className="font-normal text-[11px] text-gray-500 max-w-[90px] truncate">
                              {graphs[e.symbol]?.shortName ?? ""}
                            </div>
                          </div>
                        </div>

                        {isWishlist ? (
                          <Badge gradient="from-pink-500 to-rose-500">
                            🎯 Wishlist
                          </Badge>
                        ) : (
                          <Badge gradient="from-blue-500 to-indigo-500">
                            💼 พอร์ต
                          </Badge>
                        )}
                      </div>

                      {/* Announce Time */}
                      <div
                        className={`text-xs font-medium mb-1 flex items-center gap-1.5 ${
                          past ? "text-gray-400" : "text-gray-400"
                        }`}
                      >
                        {e.announceTime === "After Market Close"
                          ? "🔴 หลังตลาดปิด"
                          : e.announceTime === "Before Market Open"
                            ? "🟢 ก่อนตลาดเปิด"
                            : "⚪ ไม่ระบุเวลา"}
                      </div>

                      <EpsExplain eps={e.epsEstimate} isWishlist={isWishlist} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const hasAnyData =
    sections.today.length || sections.future.length || sections.past.length;

  return (
    <div>
      {selectedSymbol && (
        <StockDetailModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          currencyRate={currencyRate}
        />
      )}

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-900/8 rounded-full blur-3xl" />
      </div>

      {!loading && (
        <div className="relative z-10">
          {!hasAnyData ? (
            <div className="pt-[160px] flex flex-col items-center text-center text-gray-500">
              <div className="text-6xl mb-5 opacity-60">📭</div>
              <div className="text-lg font-semibold text-gray-400">
                ยังไม่มี Earnings เร็วๆ นี้
              </div>
              <div className="text-sm mt-2 text-gray-600">
                รอติดตามงบประกาศรอบถัดไปได้เลย 👀
              </div>
            </div>
          ) : (
            <>
              {renderSection("วันนี้", "🟡", sections.today)}
              {renderSection("กำลังจะมา", "🟢", sections.future)}
              {renderSection("ผ่านไปแล้ว", "⚪", sections.past)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
