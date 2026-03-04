"use client";

import { useState, useEffect } from "react";
import {
  FaChartLine,
  FaMicrochip,
  FaPills,
  FaBuilding,
  FaGem,
} from "react-icons/fa6";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
} from "react-icons/fa6";
import { FaSeedling, FaShieldAlt, FaUniversity } from "react-icons/fa";
import { TbMoneybag } from "react-icons/tb";
import { GiGoldBar } from "react-icons/gi";

// ─── Types ────────────────────────────────────────────────────────────────────

type StockCategory = {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
};

type RiskLevel = "low" | "medium" | "high";
type Market = "th" | "us" | "both";
type ApiErrorCode = "QUOTA_EXCEEDED" | "RATE_LIMITED" | "AI_ERROR" | "GENERIC";

export type StockRecommendation = {
  ticker: string;
  name: string;
  allocateBaht: number;
  allocatePercent: number;
  currentPrice: number;
  currency: "THB" | "USD";
  return1M: number;
  upside: number;
  reason: string;
  market: "TH" | "US";
};

export type RecommendResponse = {
  recommendations: StockRecommendation[] | null;
  summary?: string;
  generatedAt?: string;
  cached?: boolean;
  lastUsed?: string | null;
  nextAvailableAt?: string | null;
  canResearch: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STOCK_CATEGORIES: StockCategory[] = [
  {
    id: "tech",
    label: "หุ้นเทคโนโลยี",
    labelEn: "Technology",
    icon: <FaMicrochip />,
    description: "AI, Cloud, Semiconductor",
    color: "text-blue-400",
    borderColor: "border-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "pharma",
    label: "หุ้นยา / สุขภาพ",
    labelEn: "Healthcare",
    icon: <FaPills />,
    description: "Biotech, Pharma, Medical",
    color: "text-green-400",
    borderColor: "border-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "defense",
    label: "หุ้นกลาโหม",
    labelEn: "Defense",
    icon: <FaShieldAlt />,
    description: "อาวุธ, เทคโนโลยีทหาร",
    color: "text-red-400",
    borderColor: "border-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    id: "banking",
    label: "หุ้นการเงิน / ธนาคาร",
    labelEn: "Banking & Finance",
    icon: <FaUniversity />,
    description: "ธนาคาร, ประกัน, Fintech",
    color: "text-sky-400",
    borderColor: "border-sky-500",
    bgColor: "bg-sky-500/10",
  },
  {
    id: "large_cap",
    label: "หุ้นใหญ่",
    labelEn: "Large Cap",
    icon: <FaBuilding />,
    description: "Blue chip, Dividend",
    color: "text-purple-400",
    borderColor: "border-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "small_cap",
    label: "หุ้นเล็ก",
    labelEn: "Small Cap",
    icon: <FaSeedling />,
    description: "Growth, High potential",
    color: "text-orange-400",
    borderColor: "border-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "gold",
    label: "ทอง / สินทรัพย์แข็ง",
    labelEn: "Gold & Commodities",
    icon: <GiGoldBar />,
    description: "Gold, Silver, ETF",
    color: "text-yellow-400",
    borderColor: "border-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    id: "dividend",
    label: "หุ้นปันผล",
    labelEn: "Dividend",
    icon: <TbMoneybag />,
    description: "REITs, High yield",
    color: "text-pink-400",
    borderColor: "border-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    id: "growth",
    label: "หุ้นเติบโต",
    labelEn: "Growth",
    icon: <FaChartLine />,
    description: "High growth, Momentum",
    color: "text-cyan-400",
    borderColor: "border-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    id: "value",
    label: "หุ้น Value",
    labelEn: "Value",
    icon: <FaGem />,
    description: "Undervalued, P/E ต่ำ",
    color: "text-rose-400",
    borderColor: "border-rose-500",
    bgColor: "bg-rose-500/10",
  },
];

const RISK_LEVELS: {
  id: RiskLevel;
  label: string;
  desc: string;
  color: string;
}[] = [
  { id: "low", label: "ต่ำ", desc: "ปลอดภัย มั่นคง", color: "text-green-400" },
  { id: "medium", label: "กลาง", desc: "สมดุล", color: "text-yellow-400" },
  {
    id: "high",
    label: "สูง",
    desc: "High risk / reward",
    color: "text-red-400",
  },
];

const MARKETS: { id: Market; label: string; flag: string }[] = [
  { id: "th", label: "ไทย", flag: "🇹🇭" },
  { id: "us", label: "US", flag: "🇺🇸" },
  { id: "both", label: "ทั้งคู่", flag: "🌐" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpinnerIcon({ size = "w-4 h-4" }: { size?: string }) {
  return (
    <svg className={`animate-spin ${size}`} viewBox="0 0 24 24" fill="none">
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
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(Math.abs(value) / max, 1) * 100;
  return (
    <div className="w-full h-1 rounded-full bg-gray-800 overflow-hidden mt-1">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ErrorBanner({
  code,
  message,
  nextAvailableAt,
}: {
  code: ApiErrorCode;
  message: string;
  nextAvailableAt?: string | null;
}) {
  if (code === "RATE_LIMITED") {
    return (
      <div className="bg-blue-500/10 border border-blue-500/40 rounded-xl px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="text-blue-300 font-bold text-sm">
              ใช้ครบ 1 ครั้ง/วันแล้ว
            </p>
            <p className="text-blue-400/80 text-xs mt-1 leading-relaxed">
              {message}
            </p>
            {nextAvailableAt && (
              <p className="text-gray-400 text-xs mt-1.5">
                ใช้ได้อีกครั้ง:{" "}
                <span className="text-white font-semibold">
                  {formatDate(nextAvailableAt)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (code === "QUOTA_EXCEEDED") {
    return (
      <div className="bg-orange-500/10 border border-orange-500/40 rounded-xl px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🪫</span>
          <div>
            <p className="text-orange-300 font-bold text-sm">
              Gemini API Token หมดแล้ว
            </p>
            <p className="text-orange-400/80 text-xs mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-red-400 mt-0.5">⚠️</span>
        <p className="text-red-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

function StockCard({
  rec,
  rank,
  currencyRate,
}: {
  rec: StockRecommendation;
  rank: number;
  currencyRate: number;
}) {
  const isPositive1M = rec.return1M >= 0;
  const return1MColor = isPositive1M ? "text-green-400" : "text-red-400";
  const priceInThb =
    rec.currency === "USD" ? rec.currentPrice * currencyRate : rec.currentPrice;

  return (
    <div className="bg-black-lighter rounded-2xl overflow-hidden border border-gray-800">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
            <span className="text-black text-[11px] font-black">{rank}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-base tracking-wide">
                {rec.ticker}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${rec.market === "US" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}
              >
                {rec.market}
              </span>
            </div>
            <p className="text-gray-500 text-[11px] leading-tight truncate max-w-[160px]">
              {rec.name}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-yellow-400 font-black text-base leading-tight">
            ฿{rec.allocateBaht.toLocaleString("th-TH")}
          </div>
          <div className="text-gray-500 text-[11px]">
            {rec.allocatePercent}% ของพอร์ต
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[1px] bg-gray-800/60 mx-4 rounded-xl overflow-hidden mb-3">
        <div className="bg-[#111] px-3 py-2.5">
          <p className="text-gray-500 text-[10px]">ราคาปัจจุบัน</p>
          <p className="text-white text-xs font-bold mt-0.5">
            {rec.currentPrice.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-gray-500 font-normal text-[10px]">
              {rec.currency}
            </span>
          </p>
          {rec.currency === "USD" && (
            <p className="text-gray-600 text-[10px]">
              ≈฿
              {priceInThb.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
        <div className="bg-[#111] px-3 py-2.5">
          <p className="text-gray-500 text-[10px]">ย้อนหลัง 1 เดือน</p>
          <div
            className={`flex items-center gap-1 font-black text-sm mt-0.5 ${return1MColor}`}
          >
            {isPositive1M ? (
              <UpIcon className="text-[10px]" />
            ) : (
              <DownIcon className="text-[10px]" />
            )}
            {isPositive1M ? "+" : ""}
            {rec.return1M}%
          </div>
          <MiniBar
            value={rec.return1M}
            max={25}
            color={isPositive1M ? "bg-green-400" : "bg-red-400"}
          />
        </div>
        <div className="bg-[#111] px-3 py-2.5">
          <p className="text-gray-500 text-[10px]">แนวโน้มขึ้น</p>
          <div className="flex items-center gap-1 font-black text-sm mt-0.5 text-yellow-400">
            <UpIcon className="text-[10px]" />+{rec.upside}%
          </div>
          <MiniBar value={rec.upside} max={30} color="bg-yellow-400" />
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="text-gray-400 text-[11px] leading-relaxed border-l-2 border-yellow-500/50 pl-2.5">
          {rec.reason}
        </p>
      </div>
    </div>
  );
}

// ─── Usage status bar ─────────────────────────────────────────────────────────

function UsageStatusBar({
  lastUsed,
  nextAvailableAt,
  canResearch,
}: {
  lastUsed: string | null | undefined;
  nextAvailableAt: string | null | undefined;
  canResearch: boolean;
}) {
  if (!lastUsed) return null;

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs
      ${
        canResearch
          ? "bg-green-500/10 border-green-500/30 text-green-400"
          : "bg-gray-800/60 border-gray-700 text-gray-400"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span>{canResearch ? "✅" : "🕐"}</span>
        <span>
          วิเคราะห์ล่าสุด:{" "}
          <span className="text-white">{formatDate(lastUsed)}</span>
        </span>
      </div>
      {!canResearch && nextAvailableAt && (
        <span className="text-gray-500 text-[10px]">
          ใหม่ได้:{" "}
          <span className="text-gray-300">{formatDate(nextAvailableAt)}</span>
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type StockRecommendScreenProps = {
  userId: string;
  currencyRate?: number;
};

export default function StockRecommendScreen({
  userId,
  currencyRate = 36,
}: StockRecommendScreenProps) {
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("medium");
  const [market, setMarket] = useState<Market>("both");

  // Separate loading states
  const [isFetching, setIsFetching] = useState(true); // GET on mount
  const [isSubmitting, setIsSubmitting] = useState(false); // POST on submit

  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorNextAvailable, setErrorNextAvailable] = useState<
    string | null | undefined
  >();

  // ── GET on mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsFetching(true);
      try {
        const res = await fetch(
          `/api/recommend-stocks?userId=${encodeURIComponent(userId)}`,
        );
        const data = await res.json();
        if (res.ok) {
          setResult(data as RecommendResponse);
        }
      } catch {
        // silently ignore — user just won't see cached data
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [userId]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  // ── POST on submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount <= 0 || selectedCategories.length === 0) return;

    setIsSubmitting(true);
    setErrorCode(null);
    setErrorMessage(null);
    setErrorNextAvailable(undefined);

    try {
      const res = await fetch("/api/recommend-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          investmentAmount: amount,
          categories: selectedCategories,
          riskLevel,
          market,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const code: ApiErrorCode =
          data.error === "QUOTA_EXCEEDED"
            ? "QUOTA_EXCEEDED"
            : data.error === "RATE_LIMITED"
              ? "RATE_LIMITED"
              : data.error === "AI_ERROR"
                ? "AI_ERROR"
                : "GENERIC";

        setErrorCode(code);
        setErrorMessage(
          data.message ?? data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่",
        );
        setErrorNextAvailable(data.nextAvailableAt);

        // Even on RATE_LIMITED the API sends back the cached result — show it
        if (data.recommendations) {
          setResult(data as RecommendResponse);
        }
        return;
      }

      setResult(data as RecommendResponse);
      setTimeout(() => {
        document
          .getElementById("recommend-results")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch {
      setErrorCode("GENERIC");
      setErrorMessage(
        "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canResearch = result?.canResearch ?? true;
  const isValid =
    parseFloat(investmentAmount) > 0 && selectedCategories.length > 0;

  return (
    <div className="p-4 w-full pb-[120px]">
      {/* Sticky header */}
      <div className="fixed top-[67px] left-1/2 -translate-x-1/2 max-w-[450px] w-full bg-black py-3 px-5 border-b border-gray-800 z-10">
        <div className="flex items-center gap-2">
          <FaChartLine className="text-yellow-400 text-lg" />
          <span className="text-white font-bold text-sm">
            แนะนำหุ้นที่น่าลงทุน
          </span>
          <span className="ml-auto text-[10px] text-gray-600">
            powered by Gemini AI
          </span>
        </div>
      </div>

      <div className="pt-[64px] flex flex-col gap-6">
        {/* Loading skeleton on initial fetch */}
        {isFetching && (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-600">
            <SpinnerIcon size="w-6 h-6" />
            <span className="text-xs">กำลังโหลดข้อมูล...</span>
          </div>
        )}

        {!isFetching && (
          <>
            {/* Usage status bar */}
            {!canResearch && (
              <UsageStatusBar
                lastUsed={result?.lastUsed}
                nextAvailableAt={result?.nextAvailableAt}
                canResearch={canResearch}
              />
            )}

            {canResearch && (
              <div>
                {/* Investment Amount */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold">
                    💰 เงินที่อยากลงทุน
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="w-full p-3 pr-16 rounded-xl bg-black-lighter2 text-white text-lg font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 border border-gray-700 focus:border-yellow-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 text-sm font-bold">
                      THB
                    </span>
                  </div>
                  {parseFloat(investmentAmount) > 0 && (
                    <p className="text-gray-500 text-xs px-1">
                      ≈ {parseFloat(investmentAmount).toLocaleString("th-TH")}{" "}
                      บาท
                    </p>
                  )}
                </div>

                {/* Market */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold">
                    🌏 ตลาดหุ้น
                  </label>
                  <div className="flex gap-2">
                    {MARKETS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMarket(m.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition
                      ${market === m.id ? "bg-yellow-500 border-yellow-500 text-black" : "bg-black-lighter2 border-gray-700 text-gray-300 hover:border-gray-500"}`}
                      >
                        <span>{m.flag}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Level */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold">
                    ⚡ ระดับความเสี่ยง
                  </label>
                  <div className="flex gap-2">
                    {RISK_LEVELS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setRiskLevel(r.id)}
                        className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl border text-sm transition
                      ${riskLevel === r.id ? "bg-yellow-500 border-yellow-500 text-black" : "bg-black-lighter2 border-gray-700 text-gray-300 hover:border-gray-500"}`}
                      >
                        <span
                          className={`font-bold text-sm ${riskLevel === r.id ? "text-black" : r.color}`}
                        >
                          {r.label}
                        </span>
                        <span
                          className={`text-[10px] mt-0.5 ${riskLevel === r.id ? "text-black/70" : "text-gray-500"}`}
                        >
                          {r.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Picker */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold">
                    📊 ประเภทหุ้นที่สนใจ{" "}
                    <span className="text-gray-500 text-xs font-normal">
                      (เลือกได้หลายอย่าง)
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STOCK_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className={`relative flex items-center gap-3 p-3 rounded-xl border transition text-left
                        ${isSelected ? `${cat.bgColor} ${cat.borderColor} border-2` : "bg-black-lighter2 border-gray-700 border hover:border-gray-500"}`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center bg-yellow-500">
                              <svg
                                className="w-2.5 h-2.5 text-black"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                          <div
                            className={`text-xl ${isSelected ? cat.color : "text-gray-500"}`}
                          >
                            {cat.icon}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-gray-300"}`}
                            >
                              {cat.label}
                            </span>
                            <span className="text-[10px] text-gray-500 mt-0.5 truncate">
                              {cat.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedCategories.map((id) => {
                        const cat = STOCK_CATEGORIES.find((c) => c.id === id)!;
                        return (
                          <span
                            key={id}
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${cat.bgColor} ${cat.color} border ${cat.borderColor}`}
                          >
                            {cat.labelEn}
                            <button
                              onClick={() => toggleCategory(id)}
                              className="ml-0.5 opacity-70 hover:opacity-100"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting || !canResearch}
                  className={`w-full py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2
                ${
                  isValid && !isSubmitting && canResearch
                    ? "bg-yellow-500 text-black hover:bg-yellow-400 active:scale-[0.98]"
                    : "bg-gray-800 text-gray-600 cursor-not-allowed"
                }`}
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon />
                      กำลังวิเคราะห์ด้วย AI...
                    </>
                  ) : !canResearch ? (
                    <>🕐 รอการวิเคราะห์ครั้งถัดไป</>
                  ) : (
                    <>
                      <FaChartLine />
                      แนะนำหุ้นให้ฉัน
                    </>
                  )}
                </button>

                {!isValid && canResearch && (
                  <p className="text-center text-gray-600 text-xs -mt-4">
                    {!investmentAmount || parseFloat(investmentAmount) <= 0
                      ? "กรอกจำนวนเงินที่ต้องการลงทุน"
                      : "เลือกประเภทหุ้นอย่างน้อย 1 ประเภท"}
                  </p>
                )}

                {/* Error banner */}
                {errorCode && errorMessage && (
                  <ErrorBanner
                    code={errorCode}
                    message={errorMessage}
                    nextAvailableAt={errorNextAvailable}
                  />
                )}
              </div>
            )}

            {/* Results */}
            {result?.recommendations && result.recommendations.length > 0 && (
              <div id="recommend-results" className="flex flex-col gap-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 text-lg mt-0.5">✨</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-yellow-300 text-sm font-semibold">
                          {result.summary}
                        </p>
                        {result.cached && (
                          <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 border border-gray-600">
                            📋 ผลล่าสุด
                          </span>
                        )}
                      </div>
                      {result.generatedAt && (
                        <p className="text-gray-600 text-[10px] mt-1">
                          วิเคราะห์เมื่อ: {formatDate(result.generatedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {result.recommendations.map((rec, i) => (
                  <StockCard
                    key={rec.ticker}
                    rec={rec}
                    rank={i + 1}
                    currencyRate={currencyRate}
                  />
                ))}

                <div className="text-center text-gray-700 text-[10px] leading-relaxed px-4 pb-2">
                  การแนะนำนี้สร้างโดย AI
                  เพื่อเป็นข้อมูลประกอบการตัดสินใจเท่านั้น
                  ไม่ถือเป็นคำแนะนำการลงทุน กรุณาศึกษาข้อมูลก่อนลงทุนทุกครั้ง
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
