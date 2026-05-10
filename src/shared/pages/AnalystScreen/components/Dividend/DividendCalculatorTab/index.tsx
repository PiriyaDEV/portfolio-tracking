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
  originalCurrency: "THB" | "USD" | null;
  currentPrice: number | null; // fetched immediately after select
  priceLoading: boolean; // spinner while fetching price
  investmentAmount: string;
  costPerShare: string;
  useCurrentPrice: boolean;
  result: CalcResult | null;
  loading: boolean;
  error: string | null;
};

/* =======================
   Tax Logic
======================= */

const TAX_RATES = { TH: 0.1, US_W8: 0.15, US_NO_W8: 0.3 };

type TaxBreakdown = {
  grossAnnualTHB: number;
  withholdingTax: number;
  withholdingTaxRate: number;
  netAnnualTHB: number;
  netMonthlyTHB: number;
  taxLabel: string;
  taxNote: string;
};

function calcTax(result: CalcResult, usW8Ben: boolean): TaxBreakdown {
  const gross = result.annualDividendTHB ?? 0;
  const isThai = result.originalCurrency === "THB";
  const rate = isThai
    ? TAX_RATES.TH
    : usW8Ben
      ? TAX_RATES.US_W8
      : TAX_RATES.US_NO_W8;
  const taxLabel = isThai ? "ไทย 10%" : usW8Ben ? "US W-8BEN 15%" : "US 30%";
  const taxNote = isThai
    ? "ภาษีหัก ณ ที่จ่าย 10% (final tax — ไม่ต้องยื่นปลายปีถ้าไม่ต้องการเครดิตคืน)"
    : usW8Ben
      ? "หักที่สหรัฐ 15% ตามอนุสัญญาภาษีซ้อนไทย-US (W-8BEN) — ใช้เป็นเครดิตภาษีไทยได้"
      : "หักที่สหรัฐ 30% (ไม่ได้ยื่น W-8BEN) — แนะนำให้ยื่นเพื่อลดเป็น 15%";
  const withholdingTax = gross * rate;
  const netAnnualTHB = gross - withholdingTax;
  return {
    grossAnnualTHB: gross,
    withholdingTax,
    withholdingTaxRate: rate * 100,
    netAnnualTHB,
    netMonthlyTHB: netAnnualTHB / 12,
    taxLabel,
    taxNote,
  };
}

/* =======================
   Helpers
======================= */

const fmt = (v: number | null | undefined, decimals = 2) => {
  if (v == null || isNaN(v)) return "-";
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: decimals,
  }).format(v);
};

let idCounter = 0;
const newEntry = (): StockEntry => ({
  id: String(++idCounter),
  symbol: null,
  shortName: null,
  originalCurrency: null,
  currentPrice: null,
  priceLoading: false,
  investmentAmount: "",
  costPerShare: "",
  useCurrentPrice: true,
  result: null,
  loading: false,
  error: null,
});

/* =======================
   Main Component
======================= */

export default function DividendCalculatorTab() {
  const [entries, setEntries] = useState<StockEntry[]>([newEntry()]);
  const [usW8Ben, setUsW8Ben] = useState(true);

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

  // Called right after user picks a stock from the search dropdown
  const handleSymbolSelect = useCallback(
    async (id: string, symbol: string) => {
      // Immediately show symbol with spinner
      update(id, {
        symbol,
        shortName: null,
        originalCurrency: null,
        currentPrice: null,
        priceLoading: true,
        result: null,
        error: null,
      });

      try {
        const res = await fetch(
          `/api/dividend-calculator?symbol=${encodeURIComponent(symbol)}`,
        );
        if (!res.ok) throw new Error();
        const data: {
          symbol: string;
          shortName: string | null;
          currentPrice: number | null;
          originalCurrency: "THB" | "USD";
        } = await res.json();
        update(id, {
          shortName: data.shortName,
          currentPrice: data.currentPrice,
          originalCurrency: data.originalCurrency,
          priceLoading: false,
        });
      } catch {
        update(id, { priceLoading: false });
      }
    },
    [update],
  );

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
      update(entry.id, {
        result: data,
        currentPrice: data.currentPrice,
        loading: false,
      });
    } catch (err: any) {
      update(entry.id, { error: err.message, loading: false });
    }
  };

  const resultsWithTax = entries
    .filter((e) => e.result?.annualDividendTHB != null)
    .map((e) => calcTax(e.result!, usW8Ben));

  const totalGross = resultsWithTax.reduce((s, r) => s + r.grossAnnualTHB, 0);
  const totalTax = resultsWithTax.reduce((s, r) => s + r.withholdingTax, 0);
  const totalNet = resultsWithTax.reduce((s, r) => s + r.netAnnualTHB, 0);
  const totalMonthly = totalNet / 12;
  const hasResult = entries.some((e) => e.result != null);
  const hasUsStock = entries.some(
    (e) => e.result?.originalCurrency === "USD" || e.originalCurrency === "USD",
  );

  return (
    <div className="flex flex-col gap-4 px-0 pb-[150px]">
      {/* Header */}
      <div className="px-1 mb-1">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          🧮 คำนวณเงินปันผล
        </h2>
        <p className="text-[12px] text-gray-500 mt-0.5">
          ใส่หุ้นและจำนวนเงินลงทุนเพื่อดูปันผลที่คาดว่าจะได้รับต่อปี
        </p>
      </div>

      {/* W-8BEN toggle */}
      {hasUsStock && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl border border-blue-500/20"
          style={{ background: "rgba(59,130,246,0.05)" }}
        >
          <div>
            <p className="text-[13px] text-gray-300 font-medium">
              ยื่นแบบฟอร์ม W-8BEN
            </p>
            <p className="text-[11px] text-gray-600 mt-0.5">
              ลดภาษีปันผล US จาก 30% → 15%
            </p>
          </div>
          <div
            onClick={() => setUsW8Ben((v) => !v)}
            className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 ${usW8Ben ? "bg-blue-500" : "bg-gray-700"}`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${usW8Ben ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="flex flex-col gap-3">
        {entries.map((entry, idx) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            index={idx}
            canRemove={entries.length > 1}
            usW8Ben={usW8Ben}
            onSymbolSelect={(symbol) => handleSymbolSelect(entry.id, symbol)}
            onUpdate={(patch) => update(entry.id, patch)}
            onRemove={() => removeEntry(entry.id)}
            onCalculate={() => calculate(entry)}
          />
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={addEntry}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-white/[0.12] text-gray-500 text-[13px] font-medium hover:border-yellow-500/40 hover:text-yellow-400 transition-all duration-200"
      >
        <span className="text-lg">+</span>
        <span>เพิ่มหุ้น</span>
      </button>

      {/* Fixed bottom summary */}
      {hasResult && (
        <div
          className="fixed bottom-[70px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[98] px-4 py-4"
          style={{
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <div
            className="rounded-2xl border border-yellow-500/25 overflow-hidden shadow-[0_0_8px_rgba(234,179,8,0.35)]"
            style={{ background: "rgba(100,50,0,0.9)" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-yellow-500/15">
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
                  {fmt(totalMonthly)}
                </span>
                <span className="text-[11px] text-gray-500">บาท</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-5 py-2.5">
              <div className="text-center">
                <p className="text-[10px] text-gray-600">ก่อนภาษี/ปี</p>
                <p className="text-[13px] font-bold text-gray-300">
                  {fmt(totalGross)}
                </p>
              </div>
              <div className="text-gray-700 text-lg">→</div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600">ภาษีรวม</p>
                <p className="text-[13px] font-bold text-red-400">
                  −{fmt(totalTax)}
                </p>
              </div>
              <div className="text-gray-700 text-lg">→</div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600">สุทธิ/ปี</p>
                <p className="text-[13px] font-bold text-yellow-400">
                  {fmt(totalNet)}
                </p>
              </div>
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
  usW8Ben,
  onSymbolSelect,
  onUpdate,
  onRemove,
  onCalculate,
}: {
  entry: StockEntry;
  index: number;
  canRemove: boolean;
  usW8Ben: boolean;
  onSymbolSelect: (symbol: string) => void;
  onUpdate: (patch: Partial<StockEntry>) => void;
  onRemove: () => void;
  onCalculate: () => void;
}) {
  const displayName = entry.symbol
    ? (getName?.(entry.symbol) ?? entry.symbol)
    : null;

  return (
    <div
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
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
        {/* Stock search / selected display */}
        <div>
          <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">
            🔍 เลือกหุ้น
          </label>
          {entry.symbol ? (
            <div className="flex items-center justify-between bg-white/[0.05] rounded-xl px-3 py-2.5 border border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-[32px] h-[32px] rounded-full bg-cover bg-center border border-gray-600 shrink-0 ${getLogo(entry.symbol) ? "" : "bg-white/10"}`}
                  style={{ backgroundImage: `url(${getLogo(entry.symbol)})` }}
                />
                <div className="min-w-0">
                  <div className="text-white font-bold text-[14px] leading-tight">
                    {displayName}
                  </div>
                  {/* shortName or loading */}
                  {entry.priceLoading ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg
                        className="animate-spin w-3 h-3 text-gray-600"
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
                      <span className="text-[11px] text-gray-600">
                        กำลังดึงราคา...
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {entry.shortName && (
                        <span className="text-gray-500 text-[11px] truncate max-w-[130px]">
                          {entry.shortName}
                        </span>
                      )}
                      {entry.currentPrice != null && (
                        <>
                          {entry.shortName && (
                            <span className="text-gray-700 text-[10px]">·</span>
                          )}
                          <span className="text-yellow-400 font-bold text-[12px]">
                            {fmt(entry.currentPrice)}
                          </span>
                          <span className="text-gray-600 text-[10px]">
                            {entry.originalCurrency}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdate({
                    symbol: null,
                    shortName: null,
                    currentPrice: null,
                    originalCurrency: null,
                    result: null,
                    error: null,
                  })
                }
                className="text-yellow-400 text-[12px] shrink-0 ml-2"
              >
                เปลี่ยน
              </button>
            </div>
          ) : (
            <StockSearchSelect
              onSelect={onSymbolSelect}
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

          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={entry.useCurrentPrice ? "" : entry.costPerShare}
              onChange={(e) =>
                onUpdate({ costPerShare: e.target.value, result: null })
              }
              disabled={entry.useCurrentPrice}
              placeholder={
                entry.useCurrentPrice
                  ? entry.priceLoading
                    ? "กำลังดึงราคา..."
                    : entry.currentPrice != null
                      ? `ราคาตลาด ${fmt(entry.currentPrice)} ${entry.originalCurrency ?? ""}`
                      : "ดึงราคาปัจจุบันอัตโนมัติ"
                  : "เช่น 150.00"
              }
              className={`w-full border rounded-xl px-3 py-2.5 text-[14px] transition-colors focus:outline-none ${
                entry.useCurrentPrice
                  ? "bg-white/[0.02] border-white/[0.04] text-gray-700 cursor-not-allowed placeholder-gray-600"
                  : "bg-white/[0.05] border-white/[0.07] text-white placeholder-gray-700 focus:border-yellow-500/50"
              }`}
            />
          </div>
        </div>

        {entry.error && (
          <p className="text-red-400 text-[12px]">⚠️ {entry.error}</p>
        )}

        {/* Calculate button */}
        <button
          onClick={onCalculate}
          disabled={
            entry.loading ||
            entry.priceLoading ||
            !entry.symbol ||
            !entry.investmentAmount
          }
          className={`w-full py-3 rounded-xl font-bold text-[14px] transition-all duration-200 ${
            entry.loading ||
            entry.priceLoading ||
            !entry.symbol ||
            !entry.investmentAmount
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

        {entry.result && <ResultCard result={entry.result} usW8Ben={usW8Ben} />}
      </div>
    </div>
  );
}

/* =======================
   Result Card
======================= */

function ResultCard({
  result,
  usW8Ben,
}: {
  result: CalcResult;
  usW8Ben: boolean;
}) {
  const tax = calcTax(result, usW8Ben);
  const isThai = result.originalCurrency === "THB";

  return (
    <div
      className="rounded-xl border border-yellow-500/20 overflow-hidden mt-1"
      style={{ background: "rgba(245,158,11,0.03)" }}
    >
      {/* Row 1: Price + shares */}
      <div
        className="flex items-stretch border-b border-white/[0.05]"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex-1 px-3 py-3">
          <p className="text-[10px] text-gray-600 mb-0.5">ราคาปัจจุบัน</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[15px] font-black text-white">
              {fmt(result.currentPrice)}
            </span>
            <span className="text-[10px] text-gray-500 ml-0.5">
              {result.originalCurrency}
            </span>
          </div>
        </div>
        <div className="w-px bg-white/[0.05]" />
        <div className="flex-1 px-3 py-3">
          <p className="text-[10px] text-gray-600 mb-0.5">ต้นทุนที่ใช้</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[15px] font-black text-gray-200">
              {fmt(result.effectiveCostPerShare)}
            </span>
            <span className="text-[10px] text-gray-500 ml-0.5">
              {result.originalCurrency}
            </span>
          </div>
        </div>
        <div className="w-px bg-white/[0.05]" />
        <div className="flex-1 px-3 py-3 text-right">
          <p className="text-[10px] text-gray-600 mb-0.5">จำนวนหุ้น</p>
          <div className="flex items-baseline gap-0.5 justify-end">
            <span className="text-[15px] font-black text-gray-200">
              {fmt(result.shares, 0)}
            </span>
            <span className="text-[10px] text-gray-500 ml-0.5">หุ้น</span>
          </div>
        </div>
      </div>

      {/* Row 2: Dividend + Yield */}
      <div className="flex items-stretch border-b border-white/[0.05]">
        <div className="flex-1 px-3 py-3">
          <p className="text-[10px] text-gray-600 mb-0.5">ปันผล/หุ้น (TTM)</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[14px] font-bold text-gray-200">
              {fmt(result.dividendPerShare)}
            </span>
            <span className="text-[10px] text-gray-500 ml-0.5">
              {result.originalCurrency}
            </span>
          </div>
        </div>
        <div className="w-px bg-white/[0.05]" />
        <div className="flex-1 px-3 py-3 text-right">
          <p className="text-[10px] text-gray-600 mb-0.5">🪙 Dividend Yield</p>
          <span className="text-[18px] font-black text-blue-400">
            {result.dividendYieldPercent != null
              ? `${result.dividendYieldPercent.toFixed(2)}%`
              : "-"}
          </span>
        </div>
      </div>

      {/* Row 3: Tax */}
      <div className="px-3 py-3 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500 font-medium">
            🧾 ภาษีหัก ณ ที่จ่าย
          </p>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isThai
                ? "bg-green-500/15 text-green-400"
                : usW8Ben
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-red-500/15 text-red-400"
            }`}
          >
            {tax.taxLabel}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-gray-500">ก่อนภาษี (บาท/ปี)</span>
          <span className="text-[13px] text-gray-300 font-semibold">
            {fmt(tax.grossAnnualTHB)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[12px] text-gray-500">
            ภาษีหัก ({tax.withholdingTaxRate.toFixed(0)}%)
          </span>
          <span className="text-[13px] text-red-400 font-semibold">
            −{fmt(tax.withholdingTax)}
          </span>
        </div>
        <p className="text-[10px] text-gray-700 mt-1.5 leading-relaxed">
          {tax.taxNote}
        </p>
      </div>

      {/* Row 4: Net */}
      <div style={{ background: "rgba(245,158,11,0.06)" }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <span className="text-[12px] text-gray-400 font-medium">
            💰 สุทธิ/ปี (หลังภาษี)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-black text-yellow-400">
              {fmt(tax.netAnnualTHB)}
            </span>
            <span className="text-[11px] text-gray-600">บาท</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-[12px] text-gray-500 font-medium">
            📅 เฉลี่ย/เดือน
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[17px] font-black text-emerald-400">
              {fmt(tax.netMonthlyTHB)}
            </span>
            <span className="text-[11px] text-gray-600">บาท/เดือน</span>
          </div>
        </div>
      </div>
    </div>
  );
}
