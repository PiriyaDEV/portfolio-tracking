"use client";

import { getLogo, getName } from "@/app/lib/utils";
import { useState } from "react";

type Currency = "THB" | "USD";

type DividendAsset = {
  originalCurrency: Currency;
  dividendPerShare: number | null;
  annualDividend: number | null;
  annualDividendBase: number | null;
  dividendYieldPercent: number | null;
  shortName?: string;
  logoUrl?: string;
};

type DividendSummaryProps = {
  data?: {
    baseCurrency: Currency;
    totalAnnualDividend: number | null;
    perAsset: Record<string, DividendAsset> | null;
  };
};

type SortKey =
  | "symbol"
  | "dividendPerShare"
  | "dividendYieldPercent"
  | "annualDividendBase";
type SortDir = "asc" | "desc";

/* =======================
   Helpers
======================= */

const formatCurrency = (
  value: number | null | undefined,
  _currency: Currency,
) => {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}%`;
};

const rankEmoji = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
};

/* =======================
   SortIcon
======================= */

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col leading-none ml-1 opacity-60">
      <span
        className={`text-[8px] leading-none ${
          active && dir === "asc" ? "!text-amber-400" : "!text-gray-600"
        }`}
      >
        ▲
      </span>
      <span
        className={`text-[8px] leading-none ${
          active && dir === "desc" ? "!text-amber-400" : "!text-gray-600"
        }`}
      >
        ▼
      </span>
    </span>
  );
}

/* =======================
   Component
======================= */

export default function DividendSummary({ data }: DividendSummaryProps) {
  const [sortKey, setSortKey] = useState<SortKey>("annualDividendBase");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (!data) {
    return (
      <div className="mt-[80px] mx-4 bg-white/[0.03] border border-white/[0.07] text-gray-500 p-6 rounded-2xl text-center">
        <div className="text-4xl mb-2">🏦</div>
        <p>ไม่มีข้อมูลเงินปันผล</p>
      </div>
    );
  }

  const { baseCurrency, totalAnnualDividend, perAsset } = data;

  const entries = Object.entries(perAsset ?? {}).filter(
    ([, d]) =>
      d.dividendPerShare != null ||
      d.annualDividend != null ||
      d.annualDividendBase != null ||
      d.dividendYieldPercent != null,
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const sorted = [...entries].sort(([symA, a], [symB, b]) => {
    let valA: number | string;
    let valB: number | string;

    if (sortKey === "symbol") {
      valA = symA;
      valB = symB;
    } else {
      valA = a[sortKey] ?? -Infinity;
      valB = b[sortKey] ?? -Infinity;
    }

    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Yield top-3 for medals (always by yield desc, independent of sort)
  const yieldRanks = [...entries]
    .filter(([, d]) => d.dividendYieldPercent != null)
    .sort(
      ([, a], [, b]) =>
        (b.dividendYieldPercent ?? -Infinity) -
        (a.dividendYieldPercent ?? -Infinity),
    )
    .slice(0, 3)
    .map(([symbol]) => symbol);

  // Annual top-3 for medals
  const annualRanks = [...entries]
    .filter(([, d]) => d.annualDividendBase != null)
    .sort(
      ([, a], [, b]) =>
        (b.annualDividendBase ?? -Infinity) -
        (a.annualDividendBase ?? -Infinity),
    )
    .slice(0, 3)
    .map(([symbol]) => symbol);

  const thStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    color: "#6b7280",
  };

  const thClass =
    "px-3 py-3 align-middle text-[11px] font-semibold tracking-wider uppercase cursor-pointer select-none";

  return (
    <div className="mt-[80px] pb-[100px] flex flex-col gap-0">
      {/* ── Header ── */}
      <div className="mb-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          📊 สรุปเงินปันผลรายปี
        </h2>
      </div>

      {/* ── Table card ── */}
      <div
        className="rounded-2xl overflow-hidden border border-white/[0.07]"
        style={{ background: "rgba(255,255,255,0.025)" }}
      >
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={thStyle}>
              <th className={thClass} onClick={() => handleSort("symbol")}>
                หุ้น
                <SortIcon active={sortKey === "symbol"} dir={sortDir} />
              </th>
              <th
                className={thClass}
                onClick={() => handleSort("dividendPerShare")}
              >
                ปันผล/หุ้น
                <SortIcon
                  active={sortKey === "dividendPerShare"}
                  dir={sortDir}
                />
              </th>
              <th
                className={`${thClass} text-right`}
                onClick={() => handleSort("dividendYieldPercent")}
              >
                🪙 Yield
                <SortIcon
                  active={sortKey === "dividendYieldPercent"}
                  dir={sortDir}
                />
              </th>
              <th
                className={`${thClass} text-right`}
                onClick={() => handleSort("annualDividendBase")}
              >
                ต่อปี ({baseCurrency})
                <SortIcon
                  active={sortKey === "annualDividendBase"}
                  dir={sortDir}
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-gray-600 text-sm"
                >
                  ไม่มีข้อมูลรายสินทรัพย์
                </td>
              </tr>
            )}

            {sorted.map(([symbol, d]) => {
              const annualRankIdx = annualRanks.indexOf(symbol);
              const annualEmoji = rankEmoji(annualRankIdx);

              const yieldRankIndex = yieldRanks.indexOf(symbol);
              const yieldEmoji =
                yieldRankIndex === 0
                  ? "🥇"
                  : yieldRankIndex === 1
                    ? "🥈"
                    : yieldRankIndex === 2
                      ? "🥉"
                      : null;

              const isTopAnnual = annualRankIdx === 0;
              const displayName = getName ? getName(symbol) : symbol;

              return (
                <tr
                  key={symbol}
                  className="transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: isTopAnnual
                      ? "rgba(245,158,11,0.04)"
                      : "transparent",
                  }}
                >
                  {/* Symbol + logo + name */}
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                          getLogo(symbol) ? "" : "bg-white"
                        }`}
                        style={{ backgroundImage: `url(${getLogo(symbol)})` }}
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          {annualEmoji && (
                            <span className="text-sm leading-none">
                              {annualEmoji}
                            </span>
                          )}
                          <span className="font-bold text-[15px] text-white">
                            {displayName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Dividend per share */}
                  <td className="px-2 py-3 text-gray-400 align-middle text-[12px]">
                    {formatCurrency(d.dividendPerShare, d.originalCurrency)}
                    <span className="text-gray-600 ml-0.5 text-[10px]">
                      {d.originalCurrency}
                    </span>
                  </td>

                  {/* Yield */}
                  <td className="px-2 py-3 text-right align-middle">
                    <span className="inline-flex items-center gap-1 justify-end">
                      {yieldEmoji && (
                        <span className="text-sm">{yieldEmoji}</span>
                      )}
                      <span
                        className="font-bold text-[13px]"
                        style={{ color: "#60a5fa" }}
                      >
                        {formatPercent(d.dividendYieldPercent)}
                      </span>
                    </span>
                  </td>

                  {/* Annual dividend */}
                  <td className="px-4 py-3 text-right align-middle">
                    <span className="font-bold text-[13px] text-gray-100">
                      {formatCurrency(d.annualDividendBase, baseCurrency)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Fixed summary bar ── */}
      <div
        className="fixed bottom-[70px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[98] px-4 py-4"
        style={{
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <div className="flex shadow-[0_0_6px_rgba(234,179,8,0.55)] bg-yellow-600 items-center justify-between px-5 py-3.5 rounded-2xl border border-yellow-500/25">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-sm text-gray-400 font-medium">
              เงินปันผลรวมต่อปี
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black" style={{ color: "#fbbf24" }}>
              {formatCurrency(totalAnnualDividend, baseCurrency)}
            </span>
            <span className="text-[11px] text-gray-500">บาท/ปี</span>
          </div>
        </div>
      </div>
    </div>
  );
}
