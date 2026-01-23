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
import { TiRefresh as RefreshIcon } from "react-icons/ti";
import { FaEye as EyeIcon, FaEyeSlash as EyeSlashIcon } from "react-icons/fa";

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

type TimeRange = "1D" | "5D" | "1M" | "6M" | "1Y";

// Mock portfolio data
const MOCK_ASSETS: Asset[] = [
  { symbol: "AAPL", quantity: 10, costPerShare: 150 },
  { symbol: "GOOGL", quantity: 5, costPerShare: 2800 },
  { symbol: "MSFT", quantity: 8, costPerShare: 350 },
  { symbol: "TSLA", quantity: 3, costPerShare: 700 },
  { symbol: "AMZN", quantity: 4, costPerShare: 3300 },
];

export default function PortfolioSNPComparison() {
  const [isLoading, setIsLoading] = useState(false);
  const [assets] = useState<Asset[]>(MOCK_ASSETS);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isNumbersHidden, setIsNumbersHidden] = useState(false);
  const [portfolioReturn, setPortfolioReturn] = useState(0);
  const [snpReturn, setSnpReturn] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");

  // Load chart data on mount and when time range changes
  useEffect(() => {
    loadChartData();
  }, [timeRange]);

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      // Generate mock historical data based on selected time range
      const mockData: ChartDataPoint[] = [];
      const startDate = new Date();
      let dataPoints = 0;
      let interval = 0;
      let dateFormat: Intl.DateTimeFormatOptions = {};

      switch (timeRange) {
        case "1D":
          dataPoints = 24; // Hourly data
          interval = 1; // 1 hour
          dateFormat = { hour: "2-digit", minute: "2-digit" };
          startDate.setHours(startDate.getHours() - 24);
          break;
        case "5D":
          dataPoints = 40; // Every 3 hours
          interval = 3;
          dateFormat = { month: "short", day: "numeric", hour: "2-digit" };
          startDate.setDate(startDate.getDate() - 5);
          break;
        case "1M":
          dataPoints = 30; // Daily
          interval = 24;
          dateFormat = { month: "short", day: "numeric" };
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "6M":
          dataPoints = 26; // Weekly
          interval = 168; // 7 days
          dateFormat = { month: "short", day: "numeric" };
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case "1Y":
          dataPoints = 52; // Weekly
          interval = 168;
          dateFormat = { month: "short", year: "2-digit" };
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      for (let i = 0; i < dataPoints; i++) {
        const date = new Date(startDate);
        date.setHours(date.getHours() + i * interval);

        // Mock portfolio performance with varying volatility
        const volatility = timeRange === "1D" || timeRange === "5D" ? 0.5 : 2;
        const portfolioGrowth =
          100 + (i / dataPoints) * 15 + (Math.random() - 0.5) * volatility;
        const snpGrowth =
          100 + (i / dataPoints) * 12 + (Math.random() - 0.5) * volatility;

        mockData.push({
          date: date.toLocaleString("en-US", dateFormat),
          portfolio: Number(portfolioGrowth.toFixed(2)),
          snp500: Number(snpGrowth.toFixed(2)),
        });
      }

      setChartData(mockData);

      // Calculate returns
      if (mockData.length > 0) {
        const portfolioStart = mockData[0].portfolio;
        const portfolioEnd = mockData[mockData.length - 1].portfolio;
        const snpStart = mockData[0].snp500;
        const snpEnd = mockData[mockData.length - 1].snp500;

        setPortfolioReturn(
          ((portfolioEnd - portfolioStart) / portfolioStart) * 100,
        );
        setSnpReturn(((snpEnd - snpStart) / snpStart) * 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const maskNumber = (value: string | number) => {
    if (!isNumbersHidden) return value;
    return "*****";
  };

  // Loading state
  if (isLoading && chartData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Portfolio vs S&P 500</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNumbersHidden(!isNumbersHidden)}
              className="text-2xl cursor-pointer hover:text-yellow-500 transition"
              aria-label={isNumbersHidden ? "Show numbers" : "Hide numbers"}
            >
              {isNumbersHidden ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
            <RefreshIcon
              className="cursor-pointer text-3xl hover:text-yellow-500 transition"
              onClick={loadChartData}
              aria-label="Refresh data"
            />
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-gray-400 text-sm mb-2">Your Portfolio</h3>
            <p
              className={`text-3xl font-bold ${portfolioReturn >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {maskNumber(
                `${portfolioReturn >= 0 ? "+" : ""}${portfolioReturn.toFixed(2)}%`,
              )}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-gray-400 text-sm mb-2">S&P 500</h3>
            <p
              className={`text-3xl font-bold ${snpReturn >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {maskNumber(
                `${snpReturn >= 0 ? "+" : ""}${snpReturn.toFixed(2)}%`,
              )}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex flex-col items-center mb-4 gap-3">
            <h2 className="text-xl font-bold">Performance Comparison</h2>

            {/* Time Range Selector */}
            <div className="flex gap-2 bg-gray-700 p-1 rounded-lg">
              {(["1D", "5D", "1M", "6M", "1Y"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded transition ${
                    timeRange === range
                      ? "bg-yellow-500 text-black font-bold"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
                angle={timeRange === "1D" || timeRange === "5D" ? -45 : 0}
                textAnchor={
                  timeRange === "1D" || timeRange === "5D" ? "end" : "middle"
                }
                height={60}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#F3F4F6" }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="#EAB308"
                strokeWidth={3}
                name="Your Portfolio"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="snp500"
                stroke="#3B82F6"
                strokeWidth={3}
                name="S&P 500"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Assets Summary */}
        <div className="bg-gray-800 p-6 rounded-lg mt-6">
          <h3 className="text-lg font-bold mb-3">Portfolio Holdings</h3>
          <div className="text-gray-400">
            <p>Total Assets: {maskNumber(assets.length)}</p>
            <p className="text-sm mt-2">
              Symbols: {maskNumber(assets.map((a) => a.symbol).join(", "))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
