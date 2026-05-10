"use client";

import { useState, useCallback } from "react";
import { getLogo, getName } from "@/app/lib/utils";
import StockSearchSelect from "@/shared/pages/ViewScreen/components/StockSearchSelect";

/* =======================
   Types
======================= */

type CalcResult = {
  symbol: string;
  shortName: string | null;
  originalCurrency: "THB" | "USD";
  currentPrice: number | null;
  effectiveCostPerShare: number | null;
  shares: number | null;
  dividendPerShare: number | null;
  annualDividendOriginal: number | null;
  annualDividendTHB: number | null;
  dividendYieldPercent: number | null;
  usdThbRate: number;
};

type StockEntry = {
  id: string;
  symbol: string | null;
  shortName: string | null;
  investmentAmount: string;
  costPerShare: string;
  useCurrentPrice: boolean;
  result: CalcResult | null;
  loading: boolean;
  error: string | null;
};

/* =======================
   Helpers
======================= */

const fmt = (v: number | null | undefined, decimals = 2) => {
  if (v == null || isNaN(v)) return "-";
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: decimals,
  }).format(v);
};

const fmtPct = (v: number | null | undefined) => {
  if (v == null || isNaN(v)) return "-";
  return `${v.toFixed(2)}%`;
};

let idCounter = 0;
const newEntry = (): StockEntry => ({
  id: String(++idCounter),
  symbol: null,
  shortName: null,
  investmentAmount: "",
  costPerShare: "",
  useCurrentPrice: true,
  result: null,
  loading: false,
  error: null,
});

/* =======================
   Component
======================= */

export default function DividendCalculatorTab() {
  const [entries, setEntries] = useState<StockEntry[]>([newEntry()]);

  const update = useCallback(
    (id: string, patch: Partial<StockEntry>) =>
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      ),
    [],
  );

  const addEntry = () => setEntries((prev) => [...prev, newEntry()]);

  const removeEntry = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const calculate = async (entry: StockEntry) => {
    if (!entry.symbol || !entry.investmentAmount) return;

    const investmentAmount = parseFloat(
      entry.investmentAmount.replace(/,/g, ""),
    );
    const costPerShare = entry.useCurrentPrice
      ? undefined
      : parseFloat(entry.costPerShare.replace(/,/g, ""));

    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      update(entry.id, { error: "กรุณากรอกจำนวนเงินที่ถูกต้อง" });
      return;
    }
    if (
      !entry.useCurrentPrice &&
      (isNaN(costPerShare!) || costPerShare! <= 0)
    ) {
      update(entry.id, { error: "กรุณากรอกต้นทุนต่อหุ้นที่ถูกต้อง" });
      return;
    }

    update(entry.id, { loading: true, error: null, result: null });

    try {
      const res = await fetch("/api/dividend-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: entry.symbol,
          investmentAmount,
          costPerShare,
          useCurrentPrice: entry.useCurrentPrice,
        }),
      });

      if (!res.ok) throw new Error("เกิดข้อผิดพลาด");
      const data: CalcResult = await res.json();
      update(entry.id, { result: data, loading: false });
    } catch (err: any) {
      update(entry.id, { error: err.message, loading: false });
    }
  };

  const totalAnnualTHB = entries
    .filter((e) => e.result?.annualDividendTHB != null)
    .reduce((sum, e) => sum + (e.result!.annualDividendTHB ?? 0), 0);

  const hasAnyResult = entries.some((e) => e.result != null);

  return (
    <div className="flex flex-col gap-4 px-0">
      {/* Header */}
      <div className="px-1 mb-1">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          🧮 คำนวณเงินปันผล
        </h2>
        <p className="text-[12px] text-gray-500 mt-0.5">
          ใส่หุ้นและจำนวนเงินลงทุนเพื่อดูปันผลที่คาดว่าจะได้รับต่อปี
        </p>
      </div>

      {/* Stock entries */}
      <div className="flex flex-col gap-3">
        {entries.map((entry, idx) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            index={idx}
            canRemove={entries.length > 1}
            onUpdate={(patch) => update(entry.id, patch)}
            onRemove={() => removeEntry(entry.id)}
            onCalculate={() => calculate(entry)}
          />
        ))}
      </div>

      {/* Add stock button */}
      <button
        onClick={addEntry}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-white/[0.12] text-gray-500 text-[13px] font-medium hover:border-yellow-500/40 hover:text-yellow-400 transition-all duration-200"
      >
        <span className="text-lg">+</span>
        <span>เพิ่มหุ้น</span>
      </button>

      {/* Fixed total bar */}
      {hasAnyResult && (
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
                ปันผลรวมต่อปี (ประมาณ)
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-2xl font-black"
                style={{ color: "#fbbf24" }}
              >
                {fmt(totalAnnualTHB)}
              </span>
              <span className="text-[11px] text-gray-500">บาท/ปี</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================
   Entry Card
======================= */

function EntryCard({
  entry,
  index,
  canRemove,
  onUpdate,
  onRemove,
  onCalculate,
}: {
  entry: StockEntry;
  index: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<StockEntry>) => void;
  onRemove: () => void;
  onCalculate: () => void;
}) {
  const displayName = entry.symbol
    ? (getName?.(entry.symbol) ?? entry.symbol)
    : null;
  const logo = entry.symbol ? getLogo?.(entry.symbol) : null;

  return (
    <div
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <span className="text-[11px] text-gray-600 font-semibold tracking-wider uppercase">
          หุ้นที่ {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-gray-600 hover:text-red-400 transition-colors text-[18px] leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Stock search */}
        <div>
          <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">
            🔍 เลือกหุ้น
          </label>
          {entry.symbol ? (
            <div className="flex items-center justify-between bg-white/[0.05] rounded-xl px-3 py-2.5 border border-white/[0.07]">
              <div className="flex items-center gap-2">
                <div
                  className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                    getLogo(entry.symbol) ? "" : "bg-white"
                  }`}
                  style={{ backgroundImage: `url(${getLogo(entry.symbol)})` }}
                />
                <div>
                  <div className="text-white font-bold text-[14px]">
                    {displayName}
                  </div>
                  {entry.shortName && (
                    <div className="text-gray-500 text-[11px] truncate max-w-[160px]">
                      {entry.shortName}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdate({
                    symbol: null,
                    shortName: null,
                    result: null,
                    error: null,
                  })
                }
                className="!text-yellow-400 text-[12px] transition-colors"
              >
                เปลี่ยน
              </button>
            </div>
          ) : (
            <StockSearchSelect
              onSelect={(symbol: string, meta?: { shortName?: string }) =>
                onUpdate({
                  symbol,
                  shortName: meta?.shortName ?? null,
                  result: null,
                  error: null,
                })
              }
              placeholder="ค้นหาหุ้น เช่น AAPL, PTT"
            />
          )}
        </div>

        {/* Investment amount */}
        <div>
          <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">
            💵 จำนวนเงินลงทุน (บาท)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={entry.investmentAmount}
            onChange={(e) =>
              onUpdate({ investmentAmount: e.target.value, result: null })
            }
            placeholder="เช่น 100000"
            className="w-full bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2.5 text-white text-[14px] placeholder-gray-700 focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>

        {/* Cost per share */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] text-gray-500 font-medium">
              📌 ต้นทุนต่อหุ้น
            </label>
            {/* Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <div
                onClick={() =>
                  onUpdate({
                    useCurrentPrice: !entry.useCurrentPrice,
                    result: null,
                    error: null,
                  })
                }
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                  entry.useCurrentPrice
                    ? "bg-yellow-500 border-yellow-500"
                    : "bg-transparent border-gray-600"
                }`}
              >
                {entry.useCurrentPrice && (
                  <svg
                    className="w-2.5 h-2.5 text-black"
                    viewBox="0 0 10 10"
                    fill="none"
                  >
                    <path
                      d="M1.5 5L4 7.5L8.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-[11px] text-gray-500">ใช้ราคาปัจจุบัน</span>
            </label>
          </div>

          <input
            type="number"
            inputMode="decimal"
            value={entry.useCurrentPrice ? "" : entry.costPerShare}
            onChange={(e) =>
              onUpdate({ costPerShare: e.target.value, result: null })
            }
            disabled={entry.useCurrentPrice}
            placeholder={
              entry.useCurrentPrice ? "ดึงราคาปัจจุบันอัตโนมัติ" : "เช่น 150.00"
            }
            className={`w-full border rounded-xl px-3 py-2.5 text-[14px] transition-colors focus:outline-none ${
              entry.useCurrentPrice
                ? "bg-white/[0.02] border-white/[0.04] text-gray-700 cursor-not-allowed placeholder-gray-800"
                : "bg-white/[0.05] border-white/[0.07] text-white placeholder-gray-700 focus:border-yellow-500/50"
            }`}
          />
        </div>

        {/* Error */}
        {entry.error && (
          <p className="text-red-400 text-[12px]">⚠️ {entry.error}</p>
        )}

        {/* Calculate button */}
        <button
          onClick={onCalculate}
          disabled={entry.loading || !entry.symbol || !entry.investmentAmount}
          className={`w-full py-3 rounded-xl font-bold text-[14px] transition-all duration-200 ${
            entry.loading || !entry.symbol || !entry.investmentAmount
              ? "bg-white/[0.05] text-gray-700 cursor-not-allowed"
              : "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.3)] hover:bg-yellow-400 active:scale-[0.98]"
          }`}
        >
          {entry.loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              กำลังคำนวณ...
            </span>
          ) : (
            "คำนวณ"
          )}
        </button>

        {/* Result */}
        {entry.result && <ResultCard result={entry.result} />}
      </div>
    </div>
  );
}

/* =======================
   Result Card
======================= */

function ResultCard({ result }: { result: CalcResult }) {
  const fmt2 = (v: number | null | undefined) => {
    if (v == null || isNaN(v)) return "-";
    return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
      v,
    );
  };

  const rows = [
    {
      label: "ราคาปัจจุบัน",
      value:
        result.currentPrice != null
          ? `${fmt2(result.currentPrice)} ${result.originalCurrency}`
          : "-",
    },
    {
      label: "ต้นทุนที่ใช้คำนวณ",
      value:
        result.effectiveCostPerShare != null
          ? `${fmt2(result.effectiveCostPerShare)} ${result.originalCurrency}`
          : "-",
    },
    {
      label: "จำนวนหุ้นโดยประมาณ",
      value: result.shares != null ? `${fmt2(result.shares)} หุ้น` : "-",
    },
    {
      label: "ปันผล/หุ้น (TTM)",
      value:
        result.dividendPerShare != null
          ? `${fmt2(result.dividendPerShare)} ${result.originalCurrency}`
          : "-",
    },
    {
      label: "🪙 Dividend Yield",
      value:
        result.dividendYieldPercent != null
          ? `${result.dividendYieldPercent.toFixed(2)}%`
          : "-",
      highlight: true,
    },
  ];

  return (
    <div
      className="rounded-xl border border-yellow-500/20 overflow-hidden mt-1"
      style={{ background: "rgba(245,158,11,0.04)" }}
    >
      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-[12px] text-gray-500">{row.label}</span>
            <span
              className={`text-[13px] font-semibold ${
                row.highlight ? "text-blue-400" : "text-gray-200"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Annual total */}
      <div
        className="px-4 py-3 border-t border-yellow-500/20 flex items-center justify-between"
        style={{ background: "rgba(245,158,11,0.06)" }}
      >
        <span className="text-[12px] text-gray-400 font-medium">
          💰 ปันผลต่อปี (บาท)
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-[20px] font-black text-yellow-400">
            {fmt2(result.annualDividendTHB)}
          </span>
          <span className="text-[11px] text-gray-600">บาท/ปี</span>
        </div>
      </div>
    </div>
  );
}
