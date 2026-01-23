"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FaEye, FaEyeSlash } from "react-icons/fa";

/* =======================
   Types
======================= */

interface Asset {
  symbol: string;
  quantity: number;
  costPerShare: number;
}

interface ChartDataPoint {
  date: string;
  portfolio: number; // % return
  snp500: number; // % return
}

type TimeRange = "1D" | "1M" | "1Y";

interface PortfolioComparisonProps {
  assets: Asset[];
}

/* =======================
   Utils
======================= */

const RANGE_MAP: Record<TimeRange, "1d" | "1m" | "1y"> = {
  "1D": "1d",
  "1M": "1m",
  "1Y": "1y",
};

const formatTime = (unix: number, range: TimeRange) => {
  const d = new Date(unix * 1000);

  if (range === "1D") {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString();
};

/* =======================
   Component
======================= */

export default function SNPCompare({ assets }: PortfolioComparisonProps) {
  const [isNumbersHidden, setIsNumbersHidden] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [portfolioReturn, setPortfolioReturn] = useState(0);
  const [snpReturn, setSnpReturn] = useState(0);
  const [loading, setLoading] = useState(false);

  /* =======================
     Fetch from API
  ======================= */

  useEffect(() => {
    if (!assets.length) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const res = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assets,
            range: RANGE_MAP[timeRange],
          }),
        });

        const json = await res.json();

        if (!json?.data || json.data.length < 2) return;

        /* =======================
           Normalize to % return
        ======================= */

        const raw = json.data;
        const pBase = raw[0].portfolioValue;
        const sBase = raw[0].sp500Value;

        const chart: ChartDataPoint[] = raw.map((p: any) => ({
          date: formatTime(p.time, timeRange),
          portfolio: (p.portfolioValue / pBase - 1) * 100,
          snp500: (p.sp500Value / sBase - 1) * 100,
        }));

        setChartData(chart);

        /* =======================
           Summary return
        ======================= */

        const pEnd = chart.at(-1)!.portfolio;
        const sEnd = chart.at(-1)!.snp500;

        setPortfolioReturn(pEnd);
        setSnpReturn(sEnd);
      } catch (err) {
        console.error("Portfolio compare error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assets, timeRange]);

  /* =======================
     Utils
  ======================= */

  const mask = (v: string | number) => (isNumbersHidden ? "*****" : v);

  /* =======================
     Render
  ======================= */

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg">
      {/* Header */}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Portfolio vs S&P 500</h2>
        <button onClick={() => setIsNumbersHidden(!isNumbersHidden)}>
          {isNumbersHidden ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      {/* Range Selector */}
      <div className="flex gap-2 mb-4 bg-gray-800 p-1 rounded-lg w-fit">
        {(["1D", "1M", "1Y"] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`px-3 py-1 rounded text-sm transition ${
              timeRange === r
                ? "bg-yellow-500 text-black font-bold"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm">Your Portfolio</p>
          <p
            className={`text-2xl font-bold ${
              portfolioReturn >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {mask(
              `${portfolioReturn >= 0 ? "+" : ""}${portfolioReturn.toFixed(2)}%`,
            )}
          </p>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm">S&P 500</p>
          <p
            className={`text-2xl font-bold ${
              snpReturn >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {mask(`${snpReturn >= 0 ? "+" : ""}${snpReturn.toFixed(2)}%`)}
          </p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading chart...</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" tickFormatter={(v) => `${v.toFixed(1)}%`} />
            {/* <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} /> */}
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
