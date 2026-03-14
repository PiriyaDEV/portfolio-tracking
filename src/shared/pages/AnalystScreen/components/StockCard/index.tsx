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
  onSelect?: (symbol: string) => void; // ← NEW
}

export default function StockCard({
  symbol,
  price,
  levels,
  pinned = false,
  onTogglePin,
  showAnalyst = false,
  onSelect, // ← NEW
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
    ? "bg-gradient-to-br from-emerald-950/80 via-[#0d1a14] to-[#0d0f14] border-emerald-500/25 shadow-[0_0_0_1px_rgba(52,211,153,0.15),0_8px_32px_rgba(16,185,129,0.10)]"
    : buyZone
      ? "bg-gradient-to-br from-emerald-950/30 to-[#0d0f14] border-emerald-500/[0.12]"
      : takeProfit
        ? "bg-gradient-to-br from-red-950/40 to-[#0d0f14] border-red-500/[0.18]"
        : "bg-[#0d0f14] border-white/[0.06]";

  // ── Top accent line ───────────────────────────────────────────────────
  const accentBar = strongBuy
    ? "from-transparent via-emerald-500/60 to-transparent"
    : buyZone
      ? "from-transparent via-emerald-500/30 to-transparent"
      : takeProfit
        ? "from-transparent via-red-500/40 to-transparent"
        : "from-transparent via-white/[0.08] to-transparent";

  // ── % change pill ─────────────────────────────────────────────────────
  const pillVariant = isUp
    ? "bg-emerald-500/[0.08] border border-emerald-500/20 !text-emerald-400"
    : isDown
      ? "bg-red-500/[0.08] border border-red-500/20 !text-red-400"
      : "bg-white/[0.05] border border-white/10 !text-white/40";

  // ── Signal badge ──────────────────────────────────────────────────────
  const badgeVariant = strongBuy
    ? "bg-emerald-500/[0.07] border-emerald-500/25 !text-emerald-300"
    : buyZone
      ? "bg-emerald-500/[0.04] border-emerald-500/[0.12] !text-emerald-200/70"
      : "bg-red-500/[0.06] border-red-500/[0.18] !text-red-300";

  // ── Level active conditions ───────────────────────────────────────────
  const levelItems = [
    {
      label: "จุดซื้อ 1",
      value: levels.entry1,
      icon: <Target size={8} />,
      color: "!text-emerald-500/80",
      active: price <= levels.entry1 && price > levels.entry2,
      activeStyle:
        "border-emerald-400/50 bg-emerald-500/[0.08] shadow-[0_0_10px_rgba(52,211,153,0.15),inset_0_1px_0_rgba(52,211,153,0.1)]",
      activeColor: "!text-emerald-300",
      pulseColor: "bg-emerald-900",
    },
    {
      label: "จุดซื้อ 2",
      value: levels.entry2,
      icon: <Zap size={8} />,
      color: "!text-emerald-500/80",
      active: price <= levels.entry2,
      activeStyle:
        "border-emerald-400/60 bg-emerald-500/[0.12] shadow-[0_0_14px_rgba(52,211,153,0.20),inset_0_1px_0_rgba(52,211,153,0.12)]",
      activeColor: "!text-emerald-300",
      pulseColor: "bg-emerald-900",
    },
    {
      label: "จุดตัดขาดทุน",
      value: levels.stopLoss,
      icon: <Shield size={8} />,
      color: "!text-red-500/80",
      active: price <= levels.stopLoss,
      activeStyle:
        "border-red-400/50 bg-red-500/[0.10] shadow-[0_0_10px_rgba(248,113,113,0.15),inset_0_1px_0_rgba(248,113,113,0.10)]",
      activeColor: "!text-red-300",
      pulseColor: "bg-red-900",
    },
    {
      label: "แนวต้าน",
      value: levels.resistance,
      icon: <TrendingUp size={8} />,
      color: "!text-orange-400/80",
      active:
        price >= levels.resistance * 0.98 && price <= levels.resistance * 1.02,
      activeStyle:
        "border-orange-400/50 bg-orange-500/[0.08] shadow-[0_0_10px_rgba(251,146,60,0.15),inset_0_1px_0_rgba(251,146,60,0.10)]",
      activeColor: "!text-orange-300",
      pulseColor: "bg-orange-900",
    },
  ];

  return (
    <div
      className={`relative rounded-[14px] border p-3.5 overflow-hidden transition-transform duration-150 hover:-translate-y-px cursor-default backdrop-blur-xl ${cardVariant}`}
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-5 right-5 h-px bg-gradient-to-r ${accentBar}`}
      />

      {/* Ticker watermark */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-2 -right-1 text-[72px] font-black leading-none !text-white/[0.02] z-0"
      >
        {symbol}
      </span>

      {/* Pulse ring — strong buy */}
      {strongBuy && (
        <span className="absolute left-3.5 top-3.5 h-9 w-9 rounded-full animate-ping bg-emerald-500/15 z-0" />
      )}

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col gap-2.5">
        {/* ── Row 1: Logo + Name + Price + Pin ── */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2.5"
            onClick={() => onSelect?.(symbol)}
          >
            {/* Logo — click opens detail modal */}
            <div
              className={`w-9 h-9 rounded-full bg-cover bg-center bg-white border border-white/15 shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ${
                onSelect
                  ? "cursor-pointer hover:ring-2 hover:ring-white/30 hover:scale-110 transition-all duration-150"
                  : ""
              }`}
              style={{ backgroundImage: `url(${getLogo(symbol)})` }}
            />

            {/* Name + pill */}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#f0f0f0] leading-tight truncate">
                {getName(symbol)}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] !text-white/35 truncate max-w-[90px]">
                  {levels.shortName ?? getName(symbol)}
                </span>
                {/* % change pill */}
                <span
                  className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold font-mono shrink-0 ${pillVariant}`}
                >
                  {isUp ? (
                    <TrendingUp size={8} />
                  ) : isDown ? (
                    <TrendingDown size={8} />
                  ) : (
                    <Minus size={8} />
                  )}
                  {isUp && "+"}
                  {percentChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Price */}
            <div className="shrink-0 text-right">
              <p className="text-[17px] font-bold text-[#f0f0f0] font-mono leading-none">
                {fNumber(price)}
              </p>
              <p className="text-[9px] font-semibold !text-white/20 uppercase mt-0.5 text-right">
                USD
              </p>
            </div>

            {/* Pin */}
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(symbol)}
                title="Pin to watchlist"
                className={`shrink-0 rounded-lg p-1.5 transition-all hover:bg-white/[0.05] ${
                  pinned
                    ? "!text-amber-400"
                    : "!text-white/20 hover:!text-amber-400"
                }`}
              >
                <FaThumbtack size={11} />
              </button>
            )}
          </div>
        </div>

        {/* ── Signal badge ── */}
        {(strongBuy || buyZone || takeProfit) && (
          <div
            className={`flex items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-semibold uppercase backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${badgeVariant}`}
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

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* ── Levels 2×2 grid ── */}
        <div className="grid grid-cols-2 gap-1.5">
          {levelItems.map(
            ({
              label,
              value,
              icon,
              color,
              active,
              activeStyle,
              activeColor,
              pulseColor,
            }) => (
              <div
                key={label}
                className={`relative rounded-[10px] border px-2.5 py-2 transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
                  active
                    ? activeStyle
                    : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"
                }`}
              >
                {/* Pulse wash when active */}
                {active && (
                  <span
                    className={`absolute inset-0 rounded-[10px] animate-pulse opacity-10 ${pulseColor}`}
                  />
                )}

                <div
                  className={`relative flex items-center gap-1 text-[9px] font-semibold uppercase mb-1.5 ${
                    active ? activeColor : color
                  }`}
                >
                  {/* Blinking dot when active */}
                  {active && (
                    <span className="relative flex h-[6px] w-[6px] shrink-0 mr-0.5">
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${pulseColor}`}
                      />
                      <span
                        className={`relative inline-flex h-[6px] w-[6px] rounded-full ${pulseColor}`}
                      />
                    </span>
                  )}
                  {icon} {label}
                </div>

                <p
                  className={`relative text-[13px] font-bold font-mono transition-colors duration-300 ${
                    active ? "text-white" : "text-slate-200"
                  }`}
                >
                  {fNumber(value)}
                </p>
              </div>
            ),
          )}
        </div>

        {/* ── Analyst row ── */}
        {showAnalyst && levels.recommendation && (
          <div className="flex items-center justify-between rounded-[8px] border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 backdrop-blur-md">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase !text-white/20">
              <BarChart2 size={9} /> Analyst View
            </span>
            <span className="text-[11px] font-semibold !text-white/50 font-mono">
              {getAnalystLabel(getAnalystView(levels.recommendation))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
