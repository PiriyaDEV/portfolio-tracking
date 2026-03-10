"use client";

import { getLogo, getName } from "@/app/lib/utils";
import CommonLoading from "@/shared/components/common/CommonLoading";
import { useEffect, useMemo, useState } from "react";

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
    className={`inline-flex items-center gap-3 px-3 py-1 bg-gradient-to-r ${gradient} !text-white text-xs font-bold rounded-full shadow-sm ${
      pulse ? "animate-pulse" : ""
    }`}
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
      <div className="text-xs text-gray-400 mt-2">
        📊 ยังไม่มีตัวเลข EPS คาดการณ์
      </div>
    );
  }

  // 🔥 ดีมาก
  if (eps >= 5) {
    return (
      <div className="text-xs text-green-600 mt-2 font-bold">
        🚀 คาดว่าดีมาก (EPS +{eps})
      </div>
    );
  }

  // 🙂 ดี
  if (eps >= 0.3) {
    return (
      <div className="text-xs text-green-500 mt-2 font-bold">
        📈 คาดว่าดี (EPS +{eps})
      </div>
    );
  }

  // 😐 เฉยๆ (ไม่ต้อง = 0 เป๊ะ)
  if (eps > -0.3 && eps < 0.3) {
    return (
      <div className="text-xs text-yellow-500 mt-2 font-bold">
        😐 คาดว่าเฉยๆ (EPS {eps})
      </div>
    );
  }

  // 😕 แย่
  if (eps > -5) {
    return (
      <div className="text-xs text-orange-500 mt-2 font-bold">
        📉 คาดว่าแย่ (EPS {eps})
      </div>
    );
  }

  // 💀 แย่มาก
  return (
    <div className="text-xs text-red-600 mt-2 font-bold">
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
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          {icon} {title}
        </h2>

        {dates.map((date) => {
          const dayIdx = new Date(date).getDay();
          const past = isPast(date);

          return (
            <div key={date} className="mb-3">
              <div
                className={`flex items-center gap-3 text-lg font-semibold mb-3 ${
                  past ? "text-gray-500" : DAY_COLORS[dayIdx]
                }`}
              >
                {formatThaiFullDate(date)}

                {isToday(date) && (
                  <Badge gradient="from-yellow-400 to-orange-500" pulse>
                    🟡 วันนี้
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {grouped[date].map((e, i) => {
                  const isWishlist = wishlist.includes(e.symbol);

                  return (
                    <div
                      key={i}
                      className={`border rounded-xl p-4 ${
                        past
                          ? "bg-gray-900 border-gray-800 text-gray-500"
                          : "bg-white border-gray-800 text-black"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                              getLogo(e.symbol) ? "" : "bg-white"
                            }`}
                            style={{
                              backgroundImage: `url(${getLogo(e.symbol)})`,
                            }}
                          />
                          <div className="font-bold text-[16px]">
                            {getName(e.symbol)}
                          </div>
                        </div>

                        {isWishlist ? (
                          <Badge gradient="from-pink-500 to-red-500">
                            🎯 Wishlist
                          </Badge>
                        ) : (
                          <Badge gradient="from-blue-500 to-cyan-500">
                            💼 พอร์ต
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm mb-2">
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
    <div className="min-h-screen bg-black text-gray-200">
      {!loading && (
        <div>
          {!hasAnyData ? (
            <div className="pt-[160px] flex flex-col items-center text-center text-gray-400">
              <div className="text-5xl mb-4">📭</div>
              <div className="text-lg font-semibold">
                ยังไม่มี Earnings เร็วๆ นี้
              </div>
              <div className="text-sm mt-1">
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
