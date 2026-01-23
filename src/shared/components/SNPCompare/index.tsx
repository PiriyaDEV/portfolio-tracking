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
import { FaEye, FaEyeSlash, FaSync } from "react-icons/fa";

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

const formatTime = (t: number, r: TimeRange) =>
  new Date(t * 1000).toLocaleString(
    [],
    r === "1D" ? { hour: "2-digit", minute: "2-digit" } : undefined,
  );

/* =======================
   Component
======================= */

export default function SNPCompare({ assets }: { assets: Asset[] }) {
  const [range, setRange] = useState<TimeRange>("1D");
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  const [cache, setCache] = useState<Partial<Record<TimeRange, any[]>>>({});
  const data = cache[range] ?? [];

  /* =======================
     Fetch (cached)
  ======================= */

  const fetchData = async (force = false) => {
    if (!assets.length || (!force && cache[range])) return;

    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets, range: RANGE_MAP[range] }),
      });

      const json = await res.json();
      if (!json?.data?.length) return;

      const baseP = json.data[0].portfolioValue;
      const baseS = json.data[0].sp500Value;

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

  const end = data.at(-1) || { portfolio: 0, snp500: 0 };
  const mask = (v: string) => (hidden ? "*****" : v);

  /* =======================
     Render
  ======================= */

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg">
      {/* Header */}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Portfolio vs S&P 500</h2>
        <div className="flex gap-3">
          <button onClick={() => fetchData(true)} title="Refresh">
            <FaSync />
          </button>
          <button onClick={() => setHidden(!hidden)}>
            {hidden ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex gap-2 mb-4 bg-gray-800 p-1 rounded-lg w-fit">
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          ["Your Portfolio", end.portfolio],
          ["S&P 500", end.snp500],
        ].map(([label, val]: any) => (
          <div key={label} className="bg-gray-800 p-4 rounded">
            <p className="text-gray-400 text-sm">{label}</p>
            <p
              className={`text-2xl font-bold ${
                val >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {mask(`${val >= 0 ? "+" : ""}${val.toFixed(2)}%`)}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
            <Legend />
            <Line
              dataKey="portfolio"
              stroke="#EAB308"
              strokeWidth={3}
              dot={false}
            />
            <Line
              dataKey="snp500"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
