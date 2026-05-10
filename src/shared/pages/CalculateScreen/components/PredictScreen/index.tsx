"use client";

import { useState, useMemo, useEffect } from "react";
import { useMarketStore } from "@/store/useMarketStore";
import { isThaiStock, isCash, fNumber } from "@/app/lib/utils";
import { Asset } from "@/app/lib/interface";
import PredictChart from "../PredictChart";

type PredictScreenProps = {
  assets: Asset[];
};

const MILESTONES = [
  { value: 100_000, emoji: "🌱", label: "1 แสน" },
  { value: 500_000, emoji: "🏆", label: "5 แสน" },

  { value: 1_000_000, emoji: "🥳", label: "1 ล้าน" },
  { value: 2_000_000, emoji: "🔥", label: "2 ล้าน" },
  { value: 5_000_000, emoji: "💎", label: "5 ล้าน" },
  { value: 10_000_000, emoji: "🚀", label: "10 ล้าน" },

  { value: 20_000_000, emoji: "👑", label: "20 ล้าน" },
  { value: 50_000_000, emoji: "🌟", label: "50 ล้าน" },
  { value: 100_000_000, emoji: "🦄", label: "100 ล้าน" },

  { value: 200_000_000, emoji: "🏛️", label: "200 ล้าน" },
  { value: 500_000_000, emoji: "💰", label: "500 ล้าน" },

  { value: 1_000_000_000, emoji: "🌌", label: "1 พันล้าน" },
];

function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

export default function PredictScreen({ assets }: PredictScreenProps) {
  const { prices, currencyRate } = useMarketStore();

  const [years, setYears] = useState(10);
  const [annualRate, setAnnualRate] = useState(8);
  const [useCurrentRate, setUseCurrentRate] = useState(true);
  const [monthlyDeposit, setMonthlyDeposit] = useState<string>("");

  const portfolio = useMemo(() => {
    let totalCostThb = 0;
    let totalMarketThb = 0;
    assets
      .filter((a) => !isCash(a.symbol))
      .forEach((a) => {
        const isThai = isThaiStock(a.symbol);
        const price = prices[a.symbol] ?? 0;
        const cost = a.quantity * a.costPerShare;
        const market = a.quantity * price;
        totalCostThb += isThai ? cost : cost * currencyRate;
        totalMarketThb += isThai ? market : market * currencyRate;
      });
    const profitThb = totalMarketThb - totalCostThb;
    const profitPercent =
      totalCostThb > 0 ? (profitThb / totalCostThb) * 100 : 0;
    return { totalCostThb, totalMarketThb, profitThb, profitPercent };
  }, [assets, prices, currencyRate]);

  const effectiveRate = useCurrentRate
    ? parseFloat(portfolio.profitPercent.toFixed(2))
    : annualRate;

  const deposit = parseFloat(monthlyDeposit) || 0;

  // year 0 = current, year 1..N = projections
  // Monthly DCA compounding: FV = PV*(1+mr)^n + PMT*[((1+mr)^n - 1)/mr]
  const rows = useMemo(() => {
    const annualR = effectiveRate / 100;
    const monthlyR = Math.pow(1 + annualR, 1 / 12) - 1;
    return Array.from({ length: years + 1 }, (_, y) => {
      const n = y * 12;
      const baseGrowth = portfolio.totalMarketThb * Math.pow(1 + monthlyR, n);
      const dcaGrowth =
        deposit > 0 && monthlyR !== 0
          ? deposit * ((Math.pow(1 + monthlyR, n) - 1) / monthlyR)
          : deposit * n;
      const val = baseGrowth + dcaGrowth;
      const totalDeposited = portfolio.totalCostThb + deposit * n;
      const profit = val - totalDeposited;
      const totalPct = totalDeposited > 0 ? (profit / totalDeposited) * 100 : 0;
      return { y, val, profit, totalPct, totalDeposited };
    });
  }, [effectiveRate, years, portfolio, deposit]);

  const final = rows[rows.length - 1];
  const rateColor = effectiveRate >= 0 ? "text-green-400" : "text-red-400";

  // milestone chips: first year each threshold is crossed
  const milestonesHit = new Map<number, number>();
  rows.forEach((row, i) => {
    const prev = i > 0 ? rows[i - 1].val : 0;
    MILESTONES.forEach((m) => {
      if (row.val >= m.value && prev < m.value && !milestonesHit.has(m.value)) {
        milestonesHit.set(m.value, row.y);
      }
    });
  });

  const STORAGE_KEY = "predict-settings";

  // load once
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (typeof parsed.years === "number") {
        setYears(parsed.years);
      }

      if (typeof parsed.annualRate === "number") {
        setAnnualRate(parsed.annualRate);
      }

      if (typeof parsed.useCurrentRate === "boolean") {
        setUseCurrentRate(parsed.useCurrentRate);
      }

      if (typeof parsed.monthlyDeposit === "string") {
        setMonthlyDeposit(parsed.monthlyDeposit);
      }
    } catch (err) {
      console.error("Failed to load predict settings", err);
    }
  }, []);

  // save whenever changed
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        years,
        annualRate,
        useCurrentRate,
        monthlyDeposit,
      }),
    );
  }, [years, annualRate, useCurrentRate, monthlyDeposit]);

  return (
    <div className="p-4 w-full pb-[100px]">
      {/* Header */}
      <div className="mb-3 mt-[70px]">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          🔮 คาดการณ์เงินในพอร์ต
        </h2>
      </div>

      {/* ── Portfolio now ── */}
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-2">
        พอร์ตปัจจุบัน
      </p>
      <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-4">
        <div className="bg-black-lighter p-3 grid grid-cols-2 gap-2">
          {[
            {
              label: "ต้นทุนรวม",
              value: fNumber(portfolio.totalCostThb) + " THB",
              cls: "text-white",
            },
            {
              label: "มูลค่าตอนนี้",
              value: fNumber(portfolio.totalMarketThb) + " THB",
              cls: "text-white",
            },
            {
              label: "กำไร / ขาดทุน",
              value:
                (portfolio.profitThb >= 0 ? "+" : "") +
                fNumber(portfolio.profitThb) +
                " THB",
              cls: portfolio.profitThb >= 0 ? "text-green-400" : "text-red-400",
            },
            {
              label: "% กำไรรวม",
              value:
                (portfolio.profitPercent >= 0 ? "+" : "") +
                fNumber(portfolio.profitPercent, { decimalNumber: 2 }) +
                "%",
              cls:
                portfolio.profitPercent >= 0
                  ? "text-green-400"
                  : "text-red-400",
            },
          ].map((s) => (
            <div key={s.label} className="bg-black-lighter2 rounded-lg p-2.5">
              <div className="text-[11px] text-gray-500 mb-1">{s.label}</div>
              <div className={`text-[14px] font-bold ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Settings ── */}
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-2">
        ตั้งค่า
      </p>
      <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-4">
        <div className="bg-black-lighter p-4 flex flex-col gap-4">
          {/* Year slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">ระยะเวลา</span>
              <span className="text-sm font-bold text-yellow-400">
                {years} ปี
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-yellow-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>1 ปี</span>
              <span>25 ปี</span>
              <span>50 ปี</span>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Rate slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">ผลตอบแทนต่อปี</span>
              <span className={`text-sm font-bold ${rateColor}`}>
                {effectiveRate >= 0 ? "+" : ""}
                {fNumber(effectiveRate, { decimalNumber: 1 })}%
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={100}
              step={0.5}
              value={useCurrentRate ? effectiveRate : annualRate}
              disabled={useCurrentRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className={`w-full ${useCurrentRate ? "opacity-40 cursor-not-allowed" : ""}`}
              style={{
                accentColor: effectiveRate >= 0 ? "#22c55e" : "#ef4444",
              }}
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+100%</span>
            </div>
          </div>

          {/* Use current % checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCurrentRate}
              onChange={(e) => setUseCurrentRate(e.target.checked)}
              className="w-4 h-4 accent-yellow-500 rounded flex-shrink-0"
            />
            <span className="text-[13px] text-gray-400">
              ใช้ % กำไรปัจจุบัน (
              <span
                className={
                  portfolio.profitPercent >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {portfolio.profitPercent >= 0 ? "+" : ""}
                {fNumber(portfolio.profitPercent, { decimalNumber: 2 })}%
              </span>
              ) เป็นอัตราต่อปี
            </span>
          </label>

          <div className="h-px bg-white/[0.06]" />

          {/* Monthly deposit */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">💰 เติมเงินต่อเดือน</span>
              {deposit > 0 && (
                <span className="text-[11px] text-gray-500">
                  {fmtShort(deposit * 12)} THB / ปี
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={500}
                placeholder="0 บาท (ไม่เติมเงิน)"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(e.target.value)}
                className="w-full p-2 pr-14 rounded-lg bg-black-lighter2 border border-white/10 text-white outline-none focus:border-yellow-500/40 transition-colors placeholder:text-gray-600 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 pointer-events-none">
                THB/เดือน
              </span>
            </div>
            {deposit > 0 && (
              <p className="text-[11px] text-gray-600 mt-1.5">
                รวมเติมเงินใน {years} ปี ={" "}
                <span className="text-gray-400">
                  {fNumber(deposit * 12 * years)} THB
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Result card + chart (styled like screenshot) ── */}
      <div className="rounded-xl border border-yellow-500/30 overflow-hidden mb-4">
        {/* Header */}
        <div
          className="px-4 py-2.5 flex justify-between items-center"
          style={{ background: "rgba(245,158,11,0.12)" }}
        >
          <span className="text-[13px] font-bold text-white">
            ผลลัพธ์ใน {years} ปี
          </span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded"
            style={{ background: "rgba(245,158,11,0.22)", color: "#f59e0b" }}
          >
            {final.totalPct >= 0 ? "+" : ""}
            {fNumber(final.totalPct, { decimalNumber: 1 })}%
          </span>
        </div>

        {/* Numbers */}
        <div className="bg-black-lighter px-4 pt-4 pb-2 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-gray-500 mb-1">มูลค่าพอร์ต</div>
            <div className="text-[22px] font-bold text-yellow-400 leading-tight">
              {fmtShort(final.val)} THB
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {fNumber(final.val)} บาท
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 mb-1">กำไรสุทธิ</div>
            <div
              className={`text-[22px] font-bold leading-tight ${
                final.profit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {final.profit >= 0 ? "+" : ""}
              {fmtShort(final.profit)} THB
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {final.profit >= 0 ? "+" : ""}
              {fNumber(final.profit)} บาท
            </div>
          </div>
        </div>

        {/* Deposit breakdown (only shown when deposit > 0) */}
        {deposit > 0 && (
          <div className="bg-black-lighter px-4 pb-3">
            <div className="border-t border-white/[0.05] pt-2.5 flex justify-between text-[11px] text-gray-500">
              <span>ต้นทุนรวม (รวมเติม)</span>
              <span className="text-gray-400">
                {fNumber(final.totalDeposited)} THB
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 mt-1">
              <span>เงินที่เติมเพิ่มทั้งหมด</span>
              <span className="text-blue-400">
                +{fNumber(deposit * 12 * years)} THB
              </span>
            </div>
          </div>
        )}

        {/* Chart — no padding, flush to card edges */}
        <div className="bg-black-lighter px-2 pb-3">
          <PredictChart rows={rows} years={years} />
        </div>
      </div>

      {/* ── Milestone chips ── */}
      {milestonesHit.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {MILESTONES.filter((m) => milestonesHit.has(m.value)).map((m) => (
            <div
              key={m.value}
              className="flex items-center gap-1.5 text-[11px] bg-black-lighter border border-white/[0.06] rounded-full px-2.5 py-1"
            >
              <span>{m.emoji}</span>
              <span className="text-gray-300">{m.label}</span>
              <span className="text-yellow-400 font-bold">
                ปีที่ {milestonesHit.get(m.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-2">
        ตารางรายปี
      </p>
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-[12px]" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="bg-black-lighter2 border-b border-white/[0.06]">
              <th className="text-left px-3 py-2 text-[11px] text-gray-500 font-medium w-[80px]">
                ปีที่
              </th>
              <th className="text-left px-3 py-2 text-[11px] text-gray-500 font-medium">
                มูลค่า (THB)
              </th>
              <th className="text-right px-3 py-2 text-[11px] text-gray-500 font-medium w-[68px]">
                % รวม
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isYear0 = row.y === 0;
              const isFinal = row.y === years && years > 0;
              const prev = i > 0 ? rows[i - 1].val : 0;
              const hitMilestones = isYear0
                ? []
                : MILESTONES.filter(
                    (m) => row.val >= m.value && prev < m.value,
                  );

              return (
                <tr
                  key={row.y}
                  className={[
                    i % 2 === 0 ? "bg-black-lighter" : "bg-black-lighter2",
                    isFinal ? "!border !border-yellow-500/30" : "",
                    hitMilestones.length > 0 ? "!bg-yellow-500/[0.05]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-3 py-1.5 text-gray-400">
                    {isYear0 ? "ปัจจุบัน" : `ปีที่ ${row.y}`}
                    {isFinal ? " 🎯" : ""}
                  </td>
                  <td className="px-3 py-1.5 text-white font-medium">
                    {fNumber(row.val)}
                    {hitMilestones.map((m) => (
                      <span key={m.value} className="ml-1" title={m.label}>
                        {m.emoji}
                      </span>
                    ))}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-medium ${
                      isYear0
                        ? "text-gray-600"
                        : row.totalPct >= 0
                          ? "text-green-400"
                          : "text-red-400"
                    }`}
                  >
                    {isYear0
                      ? "—"
                      : `${row.totalPct >= 0 ? "+" : ""}${fNumber(row.totalPct, { decimalNumber: 1 })}%`}
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
