"use client";

import { useState, useCallback, useEffect } from "react";
import { getLogo, getName } from "@/app/lib/utils";
import StockSearchSelect from "@/shared/pages/ViewScreen/components/StockSearchSelect";
import { FaTrashCan } from "react-icons/fa6";

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
  currentPrice: number | null;
  priceLoading: boolean;
  investmentAmount: string;
  costPerShare: string;
  useCurrentPrice: boolean;
  result: CalcResult | null;
  loading: boolean;
  error: string | null;
  collapsed: boolean;
};

export type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

// Shape stored in column N
type SavedDividendEntry = {
  symbol: string;
  investmentAmount: number;
  costPerShare: number | null;
  useCurrentPrice: boolean;
  savedAt: string;
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
  collapsed: false,
});

// Build a StockEntry from a saved record (no result yet — will recalculate)
const entryFromSaved = (saved: SavedDividendEntry): StockEntry => ({
  id: String(++idCounter),
  symbol: saved.symbol,
  shortName: null,
  originalCurrency: null,
  currentPrice: null,
  priceLoading: false,
  investmentAmount: String(saved.investmentAmount),
  costPerShare: saved.costPerShare != null ? String(saved.costPerShare) : "",
  useCurrentPrice: saved.useCurrentPrice,
  result: null,
  loading: false,
  error: null,
  collapsed: false,
});

/* =======================
   Chevron SVG
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
   Sheet helpers
======================= */

function saveDividendToSheet(userId: string, entries: StockEntry[]): void {
  const toSave: SavedDividendEntry[] = entries
    .filter((e) => e.symbol && e.result)
    .map((e) => ({
      symbol: e.symbol!,
      investmentAmount: parseFloat(e.investmentAmount.replace(/,/g, "")),
      costPerShare: e.useCurrentPrice
        ? null
        : parseFloat(e.costPerShare.replace(/,/g, "")),
      useCurrentPrice: e.useCurrentPrice,
      savedAt: new Date().toISOString(),
    }));

  if (toSave.length === 0) return;

  fetch("/api/dividend-calculator/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, entries: toSave }),
  }).catch((err) => console.error("saveDividendToSheet error:", err));
}

async function loadDividendFromSheet(
  userId: string,
): Promise<SavedDividendEntry[]> {
  const res = await fetch(
    `/api/dividend-calculator/save?userId=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.entries) ? data.entries : [];
}

/* =======================
   recalculate — shared between manual calculate() and hydrate auto-calc
======================= */

async function recalculateEntry(
  entry: StockEntry,
): Promise<Partial<StockEntry>> {
  if (!entry.symbol || !entry.investmentAmount) {
    return {};
  }

  const investmentAmount = parseFloat(entry.investmentAmount.replace(/,/g, ""));

  const costPerShare = entry.useCurrentPrice
    ? undefined
    : parseFloat(entry.costPerShare.replace(/,/g, ""));

  if (isNaN(investmentAmount) || investmentAmount <= 0) {
    return {};
  }

  if (!entry.useCurrentPrice && (isNaN(costPerShare!) || costPerShare! <= 0)) {
    return {};
  }

  try {
    const res = await fetch("/api/dividend-calculator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: entry.symbol,
        investmentAmount,
        costPerShare,
        useCurrentPrice: entry.useCurrentPrice,
      }),
    });

    if (!res.ok) throw new Error();

    const data: CalcResult = await res.json();

    return {
      result: data,
      currentPrice: data.currentPrice,
      shortName: data.shortName,
      originalCurrency: data.originalCurrency,
      loading: false,
      collapsed: false,
    };
  } catch {
    return {
      loading: false,
    };
  }
}

/* =======================
   Main Component
   usW8Ben is now a prop — managed by DividendSummary (shared with MyStocks)
   Footer summary is also rendered by DividendSummary
======================= */

export default function DividendCalculatorTab({
  userId,
  usW8Ben,
  assets = [],
}: {
  userId: string;
  usW8Ben: boolean;
  assets?: Asset[];
}) {
  const [entries, setEntries] = useState<StockEntry[]>([newEntry()]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Load saved entries on mount, then auto-calculate each one ──────────────
  useEffect(() => {
    if (!userId) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;

    async function hydrate() {
      try {
        const saved = await loadDividendFromSheet(userId);

        if (cancelled) return;

        if (saved.length === 0) {
          setInitialLoading(false);
          return;
        }

        const restored = saved.map(entryFromSaved);

        const hydrated = await Promise.all(
          restored.map(async (entry) => {
            const calculated = await recalculateEntry(entry);
            return { ...entry, ...calculated };
          }),
        );

        if (cancelled) return;

        setEntries(hydrated);
        setInitialLoading(false);
      } catch {
        if (!cancelled) setInitialLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const toggleCollapse = (id: string) =>
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, collapsed: !e.collapsed } : e)),
    );

  const handleSymbolSelect = useCallback(
    async (id: string, symbol: string) => {
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

      setEntries((prev) => {
        const next = prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                result: data,
                currentPrice: data.currentPrice,
                loading: false,
                collapsed: false,
              }
            : e,
        );
        if (userId) saveDividendToSheet(userId, next);
        return next;
      });
    } catch (err: any) {
      update(entry.id, { error: err.message, loading: false });
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="flex flex-col gap-4 px-0 pb-[200px]">
        <div className="px-1 mb-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            🧮 คำนวณเงินปันผล
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            ใส่หุ้นและจำนวนเงินลงทุนเพื่อดูปันผลที่คาดว่าจะได้รับต่อปี
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.07] h-16 animate-pulse"
              style={{ background: "rgba(255,255,255,0.025)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Totals for the shared footer (passed up via render — footer rendered by DividendSummary)
  // NOTE: footer is now owned by DividendSummary. This component just renders entries.

  return (
    <div className="flex flex-col gap-4 px-0 pb-[200px]">
      {/* Header */}
      <div className="px-1 mb-1">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          🧮 คำนวณเงินปันผล
        </h2>
        <p className="text-[12px] text-gray-500 mt-0.5">
          ใส่หุ้นและจำนวนเงินลงทุนเพื่อดูปันผลที่คาดว่าจะได้รับต่อปี
        </p>
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-3">
        {entries.map((entry, idx) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            index={idx}
            canRemove={entries.length > 1}
            usW8Ben={usW8Ben}
            assets={assets}
            onSymbolSelect={(symbol) => handleSymbolSelect(entry.id, symbol)}
            onUpdate={(patch) => update(entry.id, patch)}
            onRemove={() => setDeleteTargetId(entry.id)}
            onCalculate={() => calculate(entry)}
            onToggleCollapse={() => toggleCollapse(entry.id)}
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

      {/* Calculator footer — rendered via CalcFooterData callback to parent */}
      <CalcSummaryFooterPortal entries={entries} usW8Ben={usW8Ben} />

      {deleteTargetId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-[320px] rounded-2xl border border-white/[0.08] bg-[#111] p-5">
            <h3 className="text-white font-bold text-[16px]">
              ลบหุ้นรายการนี้?
            </h3>
            <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
              หากลบแล้วข้อมูลการคำนวณของหุ้นรายการนี้จะหายไป
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 text-[13px]"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  removeEntry(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================
   Calc Summary Footer (inline — for calculator tab only)
   Uses same visual as SummaryFooter in DividendSummary
======================= */

function CalcSummaryFooterPortal({
  entries,
  usW8Ben,
}: {
  entries: StockEntry[];
  usW8Ben: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const resultsWithTax = entries
    .filter((e) => e.result?.annualDividendTHB != null)
    .map((e) => calcTax(e.result!, usW8Ben));

  const totalGross = resultsWithTax.reduce((s, r) => s + r.grossAnnualTHB, 0);
  const totalTax = resultsWithTax.reduce((s, r) => s + r.withholdingTax, 0);
  const totalNet = resultsWithTax.reduce((s, r) => s + r.netAnnualTHB, 0);
  const totalMonthly = totalNet / 12;
  const hasResult = entries.some((e) => e.result != null);

  if (!hasResult) return null;

  const fmt2 = (v: number) =>
    new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(v);

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
                {fmt2(totalMonthly)}
              </span>
              <span className="text-[11px] text-gray-500">บาท/เดือน</span>
            </div>
            <svg
              className={`w-4 h-4 text-yellow-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M6 9l6 6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
                  {fmt2(totalMonthly)}
                </span>
                <span className="text-[11px] text-gray-500">บาท</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t border-yellow-500/10">
              <div className="text-center">
                <p className="text-[10px] text-gray-600">ก่อนภาษี/ปี</p>
                <p className="text-[13px] font-bold text-gray-300">
                  {fmt2(totalGross)}
                </p>
              </div>
              <div className="text-yellow-400 text-lg">→</div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600">ภาษีรวม</p>
                <p className="text-[13px] font-bold text-red-400">
                  −{fmt2(totalTax)}
                </p>
              </div>
              <div className="text-yellow-400 text-lg">→</div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600">สุทธิ/ปี</p>
                <p className="text-[13px] font-bold text-yellow-400">
                  {fmt2(totalNet)}
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
   Entry Card
======================= */

function EntryCard({
  entry,
  index,
  canRemove,
  usW8Ben,
  assets,
  onSymbolSelect,
  onUpdate,
  onRemove,
  onCalculate,
  onToggleCollapse,
}: {
  entry: StockEntry;
  index: number;
  canRemove: boolean;
  usW8Ben: boolean;
  assets: Asset[];
  onSymbolSelect: (symbol: string) => void;
  onUpdate: (patch: Partial<StockEntry>) => void;
  onRemove: () => void;
  onCalculate: () => void;
  onToggleCollapse: () => void;
}) {
  const displayName = entry.symbol
    ? (getName?.(entry.symbol) ?? entry.symbol)
    : null;

  const tax = entry.result ? calcTax(entry.result, usW8Ben) : null;

  return (
    <div
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
      {/* Card header */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-between w-full px-4 py-2.5 border-b border-white/[0.05]"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-gray-600 font-semibold tracking-wider uppercase shrink-0">
            หุ้นที่ {index + 1}
          </span>
          {entry.collapsed && entry.symbol && (
            <div className="flex items-center gap-1.5 min-w-0">
              {entry.originalCurrency && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    entry.originalCurrency === "THB"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-blue-500/15 text-blue-400"
                  }`}
                >
                  {entry.originalCurrency}
                </span>
              )}
              <div
                className={`w-[15px] h-[15px] rounded-full bg-cover bg-center border border-gray-600 shrink-0 ${getLogo(entry.symbol) ? "" : "bg-white"}`}
                style={{ backgroundImage: `url(${getLogo(entry.symbol)})` }}
              />
              <span className="text-[12px] text-gray-300 font-medium truncate">
                {displayName}
              </span>
              {entry.loading && (
                <svg
                  className="animate-spin w-3 h-3 text-gray-600 shrink-0"
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
              )}
              {tax && !entry.loading && (
                <>
                  <span className="text-gray-700 text-[10px] shrink-0">·</span>
                  <span className="text-emerald-400 text-[12px] font-bold shrink-0">
                    {fmt(tax.netMonthlyTHB)} บาท/เดือน
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {canRemove && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="!text-red-400 transition-colors text-[18px] leading-none"
            >
              <FaTrashCan className="text-[11px]" />
            </span>
          )}
          <svg
            className={`w-4 h-4 text-yellow-400 transition-transform duration-200 ${entry.collapsed ? "-rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M6 9l6 6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Collapsible body */}
      {!entry.collapsed && (
        <div className="p-4 flex flex-col gap-3">
          {/* Stock search */}
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
                              <span className="text-gray-700 text-[10px]">
                                ·
                              </span>
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
                      investmentAmount: "",
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
                <span className="text-[11px] text-gray-500">
                  ใช้ราคาปัจจุบัน
                </span>
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

          {entry.result && (
            <ResultCard
              result={entry.result}
              usW8Ben={usW8Ben}
              portfolioAsset={
                assets.find((a) => a.symbol === entry.symbol) ?? null
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

/* =======================
   Result Card
======================= */

function ResultCard({
  result,
  usW8Ben,
  portfolioAsset,
}: {
  result: CalcResult;
  usW8Ben: boolean;
  portfolioAsset: Asset | null;
}) {
  const tax = calcTax(result, usW8Ben);
  const isThai = result.originalCurrency === "THB";

  // Portfolio gap calculation
  const targetShares = result.shares ?? 0;
  const heldShares = portfolioAsset?.quantity ?? 0;
  const gapShares = Math.max(0, targetShares - heldShares);
  const pricePerShare = result.currentPrice ?? 0;
  // For USD stocks, convert gap cost to THB
  const gapCostRaw = gapShares * pricePerShare;
  const gapCostTHB =
    result.originalCurrency === "USD"
      ? gapCostRaw * (result.usdThbRate ?? 1)
      : gapCostRaw;
  const hasPortfolioData = portfolioAsset !== null;
  const alreadyEnough = hasPortfolioData && heldShares >= targetShares;

  return (
    <div
      className="rounded-xl border border-yellow-500/20 overflow-hidden mt-1"
      style={{ background: "rgba(245,158,11,0.03)" }}
    >
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

      {/* Portfolio gap section */}
      <div
        className="border-t border-white/[0.06]"
        style={{
          background: alreadyEnough
            ? "rgba(16,185,129,0.06)"
            : "rgba(99,102,241,0.05)",
        }}
      >
        <div className="px-3 pt-3 pb-1">
          <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
            🗂️ เทียบกับ Portfolio
          </p>
        </div>

        {alreadyEnough ? (
          // ── Already holds enough ──────────────────────────────────────────
          <div className="px-3 pb-3 flex items-center gap-2">
            <span className="text-emerald-400 text-lg">✅</span>
            <div>
              <p className="text-[13px] font-bold text-emerald-400">
                ถืออยู่แล้ว {fmt(heldShares, 0)} หุ้น
              </p>
              <p className="text-[11px] text-gray-600">
                เป้า {fmt(targetShares, 0)} หุ้น — ครบแล้ว!
              </p>
            </div>
          </div>
        ) : (
          // ── Gap breakdown ─────────────────────────────────────────────────
          <div className="px-3 pb-3 flex flex-col gap-2">
            {/* Progress bar */}
            {hasPortfolioData && targetShares > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (heldShares / targetShares) * 100).toFixed(1)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">
                  {((heldShares / targetShares) * 100).toFixed(0)}%
                </span>
              </div>
            )}

            <div className="flex items-stretch gap-2">
              {/* Held */}
              <div
                className="flex-1 rounded-xl px-3 py-2 flex flex-col"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <p className="text-[10px] text-gray-600 mb-0.5">ถืออยู่</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[16px] font-black text-gray-200">
                    {hasPortfolioData ? fmt(heldShares, 0) : "—"}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-0.5">หุ้น</span>
                </div>
              </div>

              <div className="flex items-center text-gray-700 text-sm font-bold">
                /
              </div>

              {/* Target */}
              <div
                className="flex-1 rounded-xl px-3 py-2 flex flex-col"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <p className="text-[10px] text-gray-600 mb-0.5">เป้าหมาย</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[16px] font-black text-gray-200">
                    {fmt(targetShares, 0)}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-0.5">หุ้น</span>
                </div>
              </div>
            </div>

            {/* Gap highlight */}
            <div
              className="rounded-xl px-3 py-2.5 flex items-center justify-between border border-indigo-500/20"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <div>
                <p className="text-[10px] text-gray-500">ซื้อเพิ่มอีก</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[18px] font-black text-indigo-300">
                    {fmt(gapShares, 0)}
                  </span>
                  <span className="text-[11px] text-gray-500">หุ้น</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">ประมาณ</p>
                <div className="flex items-baseline gap-1 mt-0.5 justify-end">
                  <span className="text-[16px] font-black text-indigo-300">
                    {fmt(gapCostTHB, 0)}
                  </span>
                  <span className="text-[11px] text-gray-500">บาท</span>
                </div>
                {result.originalCurrency === "USD" && (
                  <p className="text-[10px] text-gray-700 mt-0.5">
                    ≈ {fmt(gapCostRaw, 0)} USD
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
