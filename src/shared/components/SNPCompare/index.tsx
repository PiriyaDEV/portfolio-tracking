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
  portfolio: number;
  snp500: number;
}

type TimeRange = "1D" | "5D" | "1W" | "1M" | "5M" | "1Y";

interface PortfolioComparisonProps {
  assets: Asset[];
}

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
            range: timeRange,
          }),
        });

        const data = await res.json();

        /* =======================
         Transform API response
      ======================= */

        const chart: ChartDataPoint[] = data.dates.map(
          (date: string, i: number) => ({
            date,
            portfolio: data.portfolio[i],
            snp500: data.snp500[i],
          }),
        );

        setChartData(chart);

        /* =======================
         Calculate returns
      ======================= */

        if (chart.length > 1) {
          const p0 = chart[0].portfolio;
          const p1 = chart.at(-1)!.portfolio;

          const s0 = chart[0].snp500;
          const s1 = chart.at(-1)!.snp500;

          setPortfolioReturn(((p1 - p0) / p0) * 100);
          setSnpReturn(((s1 - s0) / s0) * 100);
        }
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
        {(["1D", "5D", "1W", "1M", "5M", "1Y"] as TimeRange[]).map((r) => (
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
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
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
