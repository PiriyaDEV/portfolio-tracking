"use client";

import { getLogo, getName, fNumber } from "@/app/lib/utils";
import {
  isStrongBuy,
  isNormalBuy,
  isNearResistance,
  getAnalystLabel,
  getAnalystView,
} from "@/app/lib/market.logic";
import { FaThumbtack } from "react-icons/fa6";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Zap,
  Shield,
  BarChart2,
} from "lucide-react";

interface Props {
  symbol: string;
  price: number;
  levels: any;
  pinned?: boolean;
  onTogglePin?: (symbol: string) => void;
  showAnalyst?: boolean;
}

export default function StockCard({
  symbol,
  price,
  levels,
  pinned = false,
  onTogglePin,
  showAnalyst = false,
}: Props) {
  const strongBuy = isStrongBuy(price, levels.entry2);
  const buyZone = isNormalBuy(price, levels.entry1, levels.entry2);
  const takeProfit = isNearResistance(price, levels.resistance);

  const percentChange =
    levels.previousClose > 0
      ? ((levels.currentPrice - levels.previousClose) / levels.previousClose) *
        100
      : 0;

  const isUp = percentChange > 0;
  const isDown = percentChange < 0;

  // ── Card wrapper ──────────────────────────────────────────────────────
  const cardVariant = strongBuy
    ? "bg-gradient-to-br from-emerald-950/80 via-[#0d1a14] to-[#0d0f14] border-emerald-500/40 shadow-[0_0_0_1px_rgba(52,211,153,0.15),0_8px_32px_rgba(16,185,129,0.12)]"
    : buyZone
      ? "bg-gradient-to-br from-emerald-950/30 to-[#0d0f14] border-emerald-500/20"
      : takeProfit
        ? "bg-gradient-to-br from-red-950/40 to-[#0d0f14] border-red-500/25"
        : "bg-[#0d0f14] border-white/5";

  // ── Change pill ───────────────────────────────────────────────────────
  const pillVariant = isUp
    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    : isDown
      ? "bg-red-500/10 text-red-400 border border-red-500/20"
      : "bg-white/5 text-slate-500 border border-white/10";

  // ── Signal badge ──────────────────────────────────────────────────────
  const badgeVariant = strongBuy
    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
    : buyZone
      ? "bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-300"
      : "bg-red-500/[0.08] border-red-500/20 text-red-400";

  // ── Accent bar ────────────────────────────────────────────────────────
  const accentBar =
    strongBuy || buyZone
      ? "from-transparent via-emerald-500/60 to-transparent"
      : takeProfit
        ? "from-transparent via-red-500/50 to-transparent"
        : "from-transparent via-white/[0.08] to-transparent";

  return (
    <div
      className={`relative rounded-2xl border p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-default ${cardVariant}`}
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-5 right-5 h-px bg-gradient-to-r ${accentBar}`}
      />

      {/* Ticker watermark */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-3 -right-2 text-[80px] font-black leading-none tracking-tighter !text-white/[0.02] z-0"
      >
        {symbol}
      </span>

      {/* Pulse ring for STRONG BUY */}
      {strongBuy && (
        <span className="absolute left-5 top-5 h-11 w-11 rounded-xl animate-ping bg-emerald-500/20 z-0" />
      )}

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            className="w-[40px] h-[40px] rounded-full bg-cover bg-center bg-white border-[1px] border-white/20"
            style={{
              backgroundImage: `url(${getLogo(symbol)})`,
            }}
          />

          {/* Name + symbol */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight text-slate-100 tracking-tight">
              {getName(symbol)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-normal !text-gray-400 text-[12px] max-w-[120px] truncate">
                {levels.shortName ?? getName(symbol)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${pillVariant}`}
              >
                {isUp ? (
                  <TrendingUp size={9} />
                ) : isDown ? (
                  <TrendingDown size={9} />
                ) : (
                  <Minus size={9} />
                )}
                {isUp && "+"}
                {percentChange.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="shrink-0 text-right">
            <p className="text-[18px] font-bold leading-none tracking-tight text-slate-100">
              {fNumber(price)}
            </p>
            <p className="mt-1 text-[9px] font-semibold tracking-widest text-slate-700 uppercase">
              USD
            </p>
          </div>

          {/* Pin */}
          {onTogglePin && (
            <button
              onClick={() => onTogglePin(symbol)}
              title="Pin to watchlist"
              className={`shrink-0 rounded-lg p-1.5 transition-all hover:bg-white/5 ${
                pinned
                  ? "text-amber-400"
                  : "text-slate-700 hover:text-amber-400"
              }`}
            >
              <FaThumbtack size={12} />
            </button>
          )}
        </div>

        {/* Signal badge */}
        {(strongBuy || buyZone || takeProfit) && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold tracking-wide ${badgeVariant}`}
          >
            <span className="relative flex h-[7px] w-[7px] shrink-0">
              {strongBuy && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={`relative inline-flex h-[7px] w-[7px] rounded-full ${
                  strongBuy
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                    : buyZone
                      ? "bg-emerald-300 shadow-[0_0_5px_rgba(110,231,183,0.7)]"
                      : "bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.7)]"
                }`}
              />
            </span>
            {strongBuy && "🔥 จุดที่ต้องซื้อ — STRONG BUY"}
            {buyZone && "👀 โซนที่น่าสนใจในการซื้อ"}
            {takeProfit && "⚠️ เข้าใกล้แนวต้าน — TAKE PROFIT"}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Levels */}
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "จุดซื้อ 1",
              value: levels.entry1,
              icon: <Target size={9} />,
              color: "text-emerald-500",
            },
            {
              label: "จุดซื้อ 2",
              value: levels.entry2,
              icon: <Zap size={9} />,
              color: "text-emerald-500",
            },
            {
              label: "จุดตัดขาดทุน",
              value: levels.stopLoss,
              icon: <Shield size={9} />,
              color: "text-red-500",
            },
            {
              label: "แนวต้าน",
              value: levels.resistance,
              icon: <TrendingUp size={9} />,
              color: "text-orange-500",
            },
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className="rounded-xl border border-white/5 bg-white/[0.025] p-2.5 transition-colors hover:bg-white/[0.04]"
            >
              <div
                className={`mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest ${color}`}
              >
                {icon} {label}
              </div>
              <p className="text-[14px] font-bold tracking-tight text-slate-200">
                {fNumber(value)}
              </p>
            </div>
          ))}
        </div>

        {/* Analyst */}
        {showAnalyst && levels.recommendation && (
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-700">
              <BarChart2 size={9} /> Analyst View
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {getAnalystLabel(getAnalystView(levels.recommendation))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
