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
  Tooltip,
} from "recharts";
import { FaSync } from "react-icons/fa";
import CommonLoading from "@/shared/components/common/CommonLoading";
import { isCash, isThaiStock } from "@/app/lib/utils";
import { useMarketStore } from "@/store/useMarketStore";

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

const formatMoney = (v: number) =>
  new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
  }).format(v);

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
   Custom Tooltip
======================= */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="snp-tooltip">
      <p className="snp-tooltip-label">{label}</p>
      {payload.map((p: any) => (
        <p
          key={p.dataKey}
          style={{ color: p.color }}
          className="snp-tooltip-row"
        >
          <span>{p.name}</span>
          <span className="snp-tooltip-val">
            {p.value >= 0 ? "+" : ""}
            {p.value.toFixed(2)}%
          </span>
        </p>
      ))}
    </div>
  );
};

/* =======================
   Component
======================= */

export default function SNPCompare({ assets }: { assets: Asset[] }) {
  const [range, setRange] = useState<TimeRange>("1D");
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const [cache, setCache] = useState<Partial<Record<TimeRange, any[]>>>({});

  const data = cache[range] ?? [];

  useEffect(() => {
    setCache({});
  }, [assets]);

  const fetchData = async (force = false) => {
    if (!assets.length) return;
    if (!force && cache[range]?.length) return;

    setLoading(true);
    if (force) setSpinning(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: assets.filter((a) => !isCash(a.symbol)),
          range: RANGE_MAP[range],
        }),
      });

      const json = await res.json();
      if (!json?.data?.length) return;

      // ใช้ base จาก API (prev close) แทนการหา first point เอง
      // ทำให้ % ตรงกับ store ที่ใช้ previousPrice เป็น baseline เดียวกัน
      const baseP =
        json.base?.portfolio ??
        json.data.find((d: any) => d.portfolioValue > 0)?.portfolioValue ??
        1;
      const baseS =
        json.base?.sp500 ??
        json.data.find((d: any) => d.sp500Value > 0)?.sp500Value ??
        1;

      const normalized = json.data.map((d: any) => ({
        date: formatTime(d.time, range),
        portfolio: (d.portfolioValue / baseP - 1) * 100,
        snp500: (d.sp500Value / baseS - 1) * 100,
      }));

      setCache((c) => ({ ...c, [range]: normalized }));
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range, assets]);

  // ── 1D summary cards: คำนวณจาก store โดยตรง ──────────────────────────────
  // ใช้ prices/previousPrice จาก store เหมือนกับ row และ chip
  // เพื่อให้ % ตรงกันทุกที่
  const { prices, previousPrice, currencyRate } = useMarketStore();

  const portfolioBase = (() => {
    let total = 0;

    for (const a of assets) {
      if (isCash(a.symbol)) continue;

      const price = prices[a.symbol];
      if (!price) continue;

      const rate = isThaiStock(a.symbol) ? 1 : currencyRate;

      total += price * a.quantity * rate;
    }

    return total;
  })();

  const chartEnd = (() => {
    if (!data.length) return { portfolio: 0, snp500: 0, portfolioMoney: 0 };

    const last = data[data.length - 1];

    return {
      ...last,
      portfolioMoney: (portfolioBase * last.portfolio) / 100,
      snpMoney: (portfolioBase * last.snp500) / 100,
    };
  })();

  const storeEnd1D = (() => {
    const filteredAssets = assets.filter((a) => !isCash(a.symbol));
    if (!filteredAssets.length) return null;

    let portfolioNow = 0;
    let portfolioPrev = 0;
    let hasAll = true;

    for (const a of filteredAssets) {
      const cur = prices[a.symbol];
      const prev = previousPrice[a.symbol];
      if (!cur || !prev) {
        hasAll = false;
        break;
      }
      const rate = isThaiStock(a.symbol) ? 1 : currencyRate;
      portfolioNow += cur * a.quantity * rate;
      portfolioPrev += prev * a.quantity * rate;
    }

    const spCur = prices["^GSPC"];
    const spPrev = previousPrice["^GSPC"];

    if (!hasAll || !spCur || !spPrev || portfolioPrev === 0 || spPrev === 0)
      return null;

    const snpPercent = (spCur / spPrev - 1) * 100;

    return {
      portfolio: (portfolioNow / portfolioPrev - 1) * 100,
      snp500: (spCur / spPrev - 1) * 100,
      portfolioMoney: portfolioNow - portfolioPrev,
      snpMoney: (portfolioBase * snpPercent) / 100,
    };
  })();

  // 1D → ใช้ store, range อื่น → ใช้ chart end point
  const end =
    range === "1D" && storeEnd1D
      ? storeEnd1D
      : (chartEnd ?? {
          portfolio: 0,
          snp500: 0,
          portfolioMoney: 0,
          snpMoney: 0,
        });

  const getAdvice = (portfolio: number, snp500: number) => {
    const diff = portfolio - snp500;

    if (diff >= 0) {
      return {
        level: "good",
        title: "🏎️ พอร์ตแซงตลาด!",
        sub: "ยอดเยี่ยม! พอร์ตของคุณชนะ S&P 500",
      };
    }
    if (diff > -5) {
      return {
        level: "warn",
        title: "🚶 ตลาดวิ่ง เราเดิน",
        sub: "ใกล้แล้ว แต่ยังตามอยู่นิดหน่อย",
      };
    }
    return {
      level: "bad",
      title: "😬 พอร์ตตามตลาดไม่ทัน",
      sub: "ถึงเวลาทบทวนกลยุทธ์แล้ว",
    };
  };

  /* =======================
     Render
  ======================= */

  return (
    <>
      <style>{`
        .snp-wrap {
          background: linear-gradient(160deg, #0f1117 0%, #131620 60%, #0d1019 100%);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 24px;
          min-height: 542px;
          position: relative;
          overflow: hidden;
        }
        .snp-wrap::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(234,179,8,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .snp-wrap::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Range tabs */
        .snp-tabs {
          display: flex;
          gap: 2px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          padding: 4px;
          border-radius: 10px;
          width: fit-content;
        }
        .snp-tab {
          padding: 5px 14px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.18s ease;
          border: none;
          background: transparent;
          letter-spacing: 0.03em;
        }
        .snp-tab:hover:not(.active) {
          color: #d1d5db;
          background: rgba(255,255,255,0.05);
        }
        .snp-tab.active {
          background: linear-gradient(135deg, #ca8a04, #eab308);
          color: #000;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(234,179,8,0.3);
        }

        /* Refresh btn */
        .snp-refresh {
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #6b7280;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .snp-refresh:hover { color: #eab308; border-color: rgba(234,179,8,0.3); background: rgba(234,179,8,0.07); }
        .snp-refresh svg { transition: transform 0.5s ease; }
        .snp-refresh.spinning svg { animation: spin 0.6s linear; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Summary cards */
        .snp-card {
          border-radius: 12px;
          padding: 16px 20px;
          position: relative;
          overflow: hidden;
          transition: transform 0.18s ease;
        }
        .snp-card:hover { transform: translateY(-1px); }
        .snp-card.green {
          background: linear-gradient(145deg, rgba(34,197,94,0.12) 0%, rgba(22,163,74,0.05) 100%);
          border: 1px solid rgba(74,222,128,0.2);
        }
        .snp-card.red {
          background: linear-gradient(145deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.05) 100%);
          border: 1px solid rgba(248,113,113,0.2);
        }
        .snp-card.neutral {
          background: linear-gradient(145deg, rgba(107,114,128,0.12) 0%, rgba(75,85,99,0.05) 100%);
          border: 1px solid rgba(107,114,128,0.2);
        }
        .snp-card-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .snp-card-value {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .snp-card-value.green { color: #4ade80; }
        .snp-card-value.red { color: #f87171; }
        .snp-card-dot {
          position: absolute;
          top: 12px; right: 14px;
          width: 7px; height: 7px;
          border-radius: 50%;
        }
        .snp-card-dot.green { background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.6); }
        .snp-card-dot.red { background: #f87171; box-shadow: 0 0 8px rgba(248,113,113,0.6); }

        /* Tooltip */
        .snp-tooltip {
          background: rgba(15,17,23,0.95);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12px;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .snp-tooltip-label {
          color: #9ca3af;
          font-size: 11px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .snp-tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .snp-tooltip-val { font-variant-numeric: tabular-nums; }

        /* Advice banner */
        .snp-advice {
          margin-top: 12px;
          padding: 12px 18px;
          border-radius: 12px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .snp-advice.good {
          border-color: rgba(74,222,128,0.3);
          background: linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(22,163,74,0.04) 100%);
        }
        .snp-advice.warn {
          border-color: rgba(234,179,8,0.3);
          background: linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(202,138,4,0.04) 100%);
        }
        .snp-advice.bad {
          border-color: rgba(248,113,113,0.3);
          background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.04) 100%);
        }
        .snp-advice-title {
          font-weight: 700;
          font-size: 14px;
          color: #f3f4f6;
        }
        .snp-advice-sub {
          font-size: 12px;
          color: #6b7280;
        }
        .snp-advice-diff {
          font-size: 12px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(255,255,255,0.06);
        }
        .snp-advice-diff.good { color: #4ade80; }
        .snp-advice-diff.warn { color: #eab308; }
        .snp-advice-diff.bad { color: #f87171; }

        .snp-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          margin: 16px 0;
        }
      `}</style>

      <div className="snp-wrap">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="snp-tabs">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`snp-tab ${range === r ? "active" : ""}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(true)}
            title="รีเฟรช"
            className={`snp-refresh ${spinning ? "spinning" : ""}`}
          >
            <FaSync size={13} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {(
            [
              ["💼 พอร์ตของคุณ", end.portfolio],
              ["📈 S&P 500", end.snp500],
            ] as [string, number][]
          ).map(([label, val]) => {
            const tone = val > 0 ? "green" : val < 0 ? "red" : "neutral";
            return (
              <div key={label} className={`snp-card ${tone}`}>
                <div
                  className={`snp-card-dot ${tone === "neutral" ? "" : tone}`}
                />
                <p className="snp-card-label">{label}</p>
                <p className={`snp-card-value ${val >= 0 ? "green" : "red"}`}>
                  {val >= 0 ? "+" : ""}
                  {val.toFixed(2)}%
                </p>
                {label === "📈 S&P 500" && (
                  <p
                    className="!text-gray-500 text-[10px]"
                    style={{
                      fontSize: "12px",
                      marginTop: "4px",
                      fontVariantNumeric: "tabular-nums",
                      color:
                        end.snpMoney > 0
                          ? "#4ade80"
                          : end.snpMoney < 0
                            ? "#f87171"
                            : "#9ca3af",
                    }}
                  >
                    ({end.snpMoney >= 0 ? "+" : ""}
                    {formatMoney(end?.snpMoney ?? 0)} บาท)
                  </p>
                )}
                {label === "💼 พอร์ตของคุณ" && (
                  <p
                    className="!text-gray-500 text-[10px]"
                    style={{
                      fontSize: "12px",
                      marginTop: "4px",
                      fontVariantNumeric: "tabular-nums",
                      color:
                        end.portfolioMoney > 0
                          ? "#4ade80"
                          : end.portfolioMoney < 0
                            ? "#f87171"
                            : "#9ca3af",
                    }}
                  >
                    ({end.portfolioMoney >= 0 ? "+" : ""}
                    {formatMoney(end?.portfolioMoney ?? 0)} บาท)
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="snp-divider" />

        {/* Chart */}
        {loading ? (
          <div className="pt-[90px]">
            <CommonLoading isFullScreen={false} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="portfolioGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: "#4b5563", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: "#4b5563", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                itemSorter={(item) => {
                  if (item.dataKey === "portfolio") return 1;
                  if (item.dataKey === "snp500") return 2;
                  return 3;
                }}
              />
              <Line
                dataKey="portfolio"
                name="💼 พอร์ตของคุณ"
                stroke="#eab308"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#eab308",
                  stroke: "#000",
                  strokeWidth: 2,
                }}
              />
              <Line
                dataKey="snp500"
                name="📈 S&P 500"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#3B82F6",
                  stroke: "#000",
                  strokeWidth: 2,
                }}
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
          const diff = end.portfolio - end.snp500;
          return (
            <div className={`snp-advice ${advice.level}`}>
              <div>
                <p className="snp-advice-title">{advice.title}</p>
                <p className="snp-advice-sub">{advice.sub}</p>
              </div>
              <div className={`snp-advice-diff ${advice.level}`}>
                {diff >= 0 ? "+" : ""}
                {diff.toFixed(2)}% vs ตลาด
              </div>
            </div>
          );
        })()}
    </>
  );
}
