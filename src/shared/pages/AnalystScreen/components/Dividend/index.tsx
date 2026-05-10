"use client";

import { getLogo, getName } from "@/app/lib/utils";
import { useState } from "react";
import { GraphModal } from "../GraphPrice/components/GraphModal";
import { useMarketStore } from "@/store/useMarketStore";
import DividendCalculatorTab, { type Asset } from "./DividendCalculatorTab";

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
  userId: string;
  assets?: Asset[];
};

type SortKey =
  | "symbol"
  | "dividendPerShare"
  | "dividendYieldPercent"
  | "annualDividendBase";
type SortDir = "asc" | "desc";
type TabId = "my_stocks" | "calculator";

/* =======================
   Tax Logic (shared)
======================= */

const TAX_RATES = { TH: 0.1, US_W8: 0.15, US_NO_W8: 0.3 };

function calcTaxRate(currency: Currency, usW8Ben: boolean): number {
  if (currency === "THB") return TAX_RATES.TH;
  return usW8Ben ? TAX_RATES.US_W8 : TAX_RATES.US_NO_W8;
}

function applyTax(
  grossTHB: number | null,
  currency: Currency,
  usW8Ben: boolean,
): { net: number | null; tax: number | null; rate: number } {
  const rate = calcTaxRate(currency, usW8Ben);
  if (grossTHB == null) return { net: null, tax: null, rate };
  const tax = grossTHB * rate;
  return { net: grossTHB - tax, tax, rate };
}

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
   Chevron
======================= */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-yellow-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =======================
   W-8BEN Toggle (inline compact)
======================= */

function W8BenToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 whitespace-nowrap shrink-0 border ${
        value
          ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
          : "bg-white/[0.05] border-white/[0.08] text-gray-600"
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
          value
            ? "border-blue-400 bg-blue-400"
            : "border-gray-600 bg-transparent"
        }`}
      >
        {value && (
          <svg className="w-2 h-2 text-black" viewBox="0 0 8 8" fill="none">
            <path
              d="M1 4l2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      W-8BEN
    </button>
  );
}

/* =======================
   Tab Pills
======================= */

const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: "my_stocks", emoji: "📊", label: "หุ้นของฉัน" },
  { id: "calculator", emoji: "🧮", label: "คำนวณปันผล" },
];

function TabPills({
  active,
  onChange,
  usW8Ben,
  onW8BenChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
  usW8Ben: boolean;
  onW8BenChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium
                whitespace-nowrap shrink-0 transition-all duration-200
                ${
                  isActive
                    ? "bg-yellow-400 text-black shadow-[0_0_12px_rgba(255,200,0,0.35)]"
                    : "bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white/90"
                }
              `}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* W-8BEN always visible, right-aligned */}
      <W8BenToggle value={usW8Ben} onChange={onW8BenChange} />
    </div>
  );
}

/* =======================
   Shared Summary Footer
======================= */

function SummaryFooter({
  totalGross,
  totalTax,
  totalNet,
  baseCurrency,
}: {
  totalGross: number | null;
  totalTax: number | null;
  totalNet: number | null;
  baseCurrency: Currency;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const totalMonthly = totalNet != null ? totalNet / 12 : null;

  if (totalNet == null) return null;

  return (
    <div
      className="fixed bottom-[70px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[98] p-2"
      style={{
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <div
        className="rounded-2xl border border-yellow-500/25 overflow-hidden shadow-[0_0_8px_rgba(234,179,8,0.35)]"
        style={{ background: "rgba(100,50,0,0.9)" }}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-between w-full px-5 py-3"
        >
          <span className="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">
            💰 เงินปันผลรวม (หลังภาษี)
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-[18px] font-black text-emerald-400">
                {formatCurrency(totalMonthly, baseCurrency)}
              </span>
              <span className="text-[11px] text-gray-500">บาท/เดือน</span>
            </div>
            <Chevron open={!collapsed} />
          </div>
        </button>

        {!collapsed && (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-t border-yellow-500/15">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-[11px] text-gray-400 leading-none">
                    เฉลี่ย/เดือน
                  </p>
                  <p className="text-[10px] text-gray-600">(หลังภาษี)</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] font-black text-emerald-400">
                  {formatCurrency(totalMonthly, baseCurrency)}
                </span>
                <span className="text-[11px] text-gray-500">บาท</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t border-yellow-500/10">
              <div className="text-center">
                <p className="text-[10px] text-gray-600">ก่อนภาษี/ปี</p>
                <p className="text-[13px] font-bold text-gray-300">
                  {formatCurrency(totalGross, baseCurrency)}
                </p>
              </div>
              <div className="text-yellow-400 text-lg">→</div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600">ภาษีรวม</p>
                <p className="text-[13px] font-bold text-red-400">
                  −{formatCurrency(totalTax, baseCurrency)}
                </p>
              </div>
              <div className="text-yellow-400 text-lg">→</div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600">สุทธิ/ปี</p>
                <p className="text-[13px] font-bold text-yellow-400">
                  {formatCurrency(totalNet, baseCurrency)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =======================
   My Stocks Tab
======================= */

function MyStocksTab({
  data,
  usW8Ben,
}: Pick<DividendSummaryProps, "data"> & { usW8Ben: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>("annualDividendBase");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { currencyRate } = useMarketStore();

  if (!data) {
    return (
      <div className="mt-6 mx-4 bg-white/[0.03] border border-white/[0.07] text-gray-500 p-6 rounded-2xl text-center">
        <div className="text-4xl mb-2">🏦</div>
        <p>ไม่มีข้อมูลเงินปันผล</p>
      </div>
    );
  }

  const { baseCurrency, perAsset } = data;

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

  const yieldRanks = [...entries]
    .filter(([, d]) => d.dividendYieldPercent != null)
    .sort(
      ([, a], [, b]) =>
        (b.dividendYieldPercent ?? -Infinity) -
        (a.dividendYieldPercent ?? -Infinity),
    )
    .slice(0, 3)
    .map(([symbol]) => symbol);

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
    <div className="pb-[160px] flex flex-col gap-0">
      {selectedSymbol && (
        <GraphModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          currencyRate={currencyRate}
        />
      )}

      {/* Header */}
      <div className="mb-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          📊 สรุปเงินปันผลรายปี
        </h2>
      </div>

      {/* Table card */}
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
                สุทธิ/ปี
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
              const shortName = d.shortName ?? "";

              // Apply tax to annualDividendBase
              const { net: netAnnual } = applyTax(
                d.annualDividendBase,
                d.originalCurrency,
                usW8Ben,
              );

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
                  <td className="px-3 py-3 align-middle">
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSymbol(symbol);
                      }}
                    >
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
                        {shortName && (
                          <div className="font-normal text-gray-400 text-[12px] max-w-[120px] truncate">
                            {shortName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-3 text-gray-400 align-middle text-[12px]">
                    {formatCurrency(d.dividendPerShare, d.originalCurrency)}
                    <span className="text-gray-600 ml-0.5 text-[10px]">
                      {d.originalCurrency}
                    </span>
                  </td>

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

                  <td className="px-4 py-3 text-right align-middle">
                    <span className="font-bold text-[13px] text-emerald-400">
                      {formatCurrency(netAnnual, baseCurrency)}
                    </span>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {formatCurrency(
                        netAnnual != null ? netAnnual / 12 : null,
                        baseCurrency,
                      )}
                      /เดือน
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =======================
   Root Component
======================= */

export default function DividendSummary({
  data,
  userId,
  assets = [],
}: DividendSummaryProps) {
  const [activeTab, setActiveTab] = useState<TabId>("my_stocks");
  const [usW8Ben, setUsW8Ben] = useState(true);

  // Compute totals for my_stocks footer
  const myStocksTotals = (() => {
    if (!data?.perAsset) return null;
    const baseCurrency = data.baseCurrency;
    let totalGross = 0;
    let totalTax = 0;
    let hasAny = false;

    Object.values(data.perAsset).forEach((d) => {
      if (d.annualDividendBase == null) return;
      hasAny = true;
      const { net, tax } = applyTax(
        d.annualDividendBase,
        d.originalCurrency,
        usW8Ben,
      );
      totalGross += d.annualDividendBase;
      totalTax += tax ?? 0;
    });

    if (!hasAny) return null;
    return {
      baseCurrency,
      totalGross,
      totalTax,
      totalNet: totalGross - totalTax,
    };
  })();

  return (
    <div className="flex flex-col">
      {/* Sticky tab pills with W-8BEN */}
      <div className="fixed top-[160px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[99]">
        <div className="flex items-center justify-between px-4 py-2.5 bg-black-lighter border-b border-white/[0.06] border-b border-yellow-400/[0.5]">
          <TabPills
            active={activeTab}
            onChange={setActiveTab}
            usW8Ben={usW8Ben}
            onW8BenChange={setUsW8Ben}
          />
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-[140px]">
        {activeTab === "my_stocks" ? (
          <MyStocksTab data={data} usW8Ben={usW8Ben} />
        ) : (
          <DividendCalculatorTab
            userId={userId}
            usW8Ben={usW8Ben}
            assets={assets}
          />
        )}
      </div>

      {/* Shared footer */}
      {activeTab === "my_stocks" && myStocksTotals && (
        <SummaryFooter
          totalGross={myStocksTotals.totalGross}
          totalTax={myStocksTotals.totalTax}
          totalNet={myStocksTotals.totalNet}
          baseCurrency={myStocksTotals.baseCurrency}
        />
      )}
    </div>
  );
}
