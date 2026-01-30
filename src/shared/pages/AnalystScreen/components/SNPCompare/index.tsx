"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FaSync } from "react-icons/fa";
import CommonLoading from "@/shared/components/common/CommonLoading";

/* =======================
   Types & constants
======================= */

interface Asset {
  symbol: string;
  quantity: number;
  costPerShare: number;
}

type TimeRange = "1D" | "5D" | "1M" | "6M" | "1Y";
type ApiRange = "1d" | "5d" | "1m" | "6m" | "1y";

export const TIME_RANGES = ["1D", "5D", "1M", "6M", "1Y"] as const;

const RANGE_MAP: Record<TimeRange, ApiRange> = {
  "1D": "1d",
  "5D": "5d",
  "1M": "1m",
  "6M": "6m",
  "1Y": "1y",
};

/* =======================
   Time formatter
======================= */

const formatTime = (t: number, r: TimeRange) => {
  const d = new Date(t * 1000);

  if (r === "1D") {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/* =======================
   Component
======================= */

export default function SNPCompare({ assets }: { assets: Asset[] }) {
  const [range, setRange] = useState<TimeRange>("1D");
  const [loading, setLoading] = useState(false);

  // cache per range
  const [cache, setCache] = useState<Partial<Record<TimeRange, any[]>>>({});

  const data = cache[range] ?? [];

  /* =======================
     Clear cache when assets change
  ======================= */
  useEffect(() => {
    setCache({});
  }, [assets]);

  /* =======================
     Fetch (cached per range)
  ======================= */
  const fetchData = async (force = false) => {
    if (!assets.length) return;
    if (!force && cache[range]?.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets,
          range: RANGE_MAP[range],
        }),
      });

      const json = await res.json();
      if (!json?.data?.length) return;

      const baseP = json.data[0].portfolioValue || 1;
      const baseS = json.data[0].sp500Value || 1;

      const normalized = json.data.map((d: any) => ({
        date: formatTime(d.time, range),
        portfolio: (d.portfolioValue / baseP - 1) * 100,
        snp500: (d.sp500Value / baseS - 1) * 100,
      }));

      setCache((c) => ({ ...c, [range]: normalized }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range, assets]);

  const end = data.at(-1) ?? { portfolio: 0, snp500: 0 };

  const getAdvice = (portfolio: number, snp500: number) => {
    const diff = portfolio - snp500;

    if (diff >= 0) {
      return { level: "good", title: "🏎️ พอร์ตแซงตลาด!" };
    }

    if (diff > -5) {
      return { level: "warn", title: "🚶 ตลาดวิ่ง เราเดิน" };
    }

    return { level: "bad", title: "😬 พอร์ตตามตลาดไม่ทัน" };
  };

  /* =======================
     Render
  ======================= */

  return (
    <div>
      <div className="bg-black-lighter text-white p-4 rounded-lg min-h-[542px]">
        {/* Header */}
        <div className="flex justify-between mb-6">
          <div className="flex gap-2 bg-black-lighter2 p-1 rounded-lg w-fit">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded text-sm ${
                  range === r
                    ? "bg-yellow-500 text-black font-bold"
                    : "text-gray-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => fetchData(true)} title="รีเฟรช">
              <FaSync />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            ["พอร์ตของคุณ", end.portfolio],
            ["S&P 500", end.snp500],
          ].map(([label, val]: any) => (
            <div
              key={label}
              className={`p-4 rounded
                ${
                  val > 0
                    ? "bg-gradient-to-b from-green-500/25 via-green-400/10 to-transparent border border-green-400"
                    : val < 0
                      ? "bg-gradient-to-b from-red-500/25 via-red-400/10 to-transparent border border-red-400"
                      : "bg-gradient-to-b from-gray-400/20 to-transparent"
                }
              `}
            >
              <p className="text-gray-400 text-sm">{label}</p>
              <p
                className={`text-2xl font-bold ${
                  val >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {`${val >= 0 ? "+" : ""}${val.toFixed(2)}%`}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {loading ? (
          <div className="pt-[90px]">
            <CommonLoading isFullScreen={false} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
              <Legend
                itemSorter={(item) => {
                  if (item.dataKey === "portfolio") return 1;
                  if (item.dataKey === "snp500") return 2;
                  return 3;
                }}
              />

              <Line
                dataKey="portfolio"
                name="พอร์ตของคุณ"
                stroke="#EAB308"
                strokeWidth={3}
                dot={false}
              />
              <Line
                dataKey="snp500"
                name="S&P 500"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Portfolio Advice */}
      {!loading &&
        data.length > 0 &&
        (() => {
          const advice = getAdvice(end.portfolio, end.snp500);

          const styleMap: Record<string, string> = {
            good: "border-green-600 bg-gradient-to-b from-green-500/25 via-green-400/10",
            warn: "border-yellow-600 bg-gradient-to-b from-yellow-500/25 via-yellow-400/10",
            bad: "border-red-600 bg-gradient-to-b from-red-500/25 via-red-400/10",
          };

          return (
            <div
              className={`mt-3 p-2 rounded-lg border text-center font-bold ${styleMap[advice.level]}`}
            >
              {advice.title}
            </div>
          );
        })()}
    </div>
  );
}
