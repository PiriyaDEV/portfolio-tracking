"use client";

import React from "react";
import { fNumber } from "@/app/lib/utils";

/* =======================
   Types
======================= */

type FearGreedConfig = {
  min: number;
  max: number;
  label: string;
  emoji: string;
  bg: string;
  text: string;
};

/* =======================
   Config
======================= */

const FEAR_GREED_MAP: FearGreedConfig[] = [
  {
    min: 0,
    max: 25,
    label: "กลัวขั้นสุด",
    emoji: "😱",
    bg: "!bg-red-900/60",
    text: "!text-red-300",
  },
  {
    min: 25,
    max: 45,
    label: "กลัว",
    emoji: "😟",
    bg: "!bg-orange-900/60",
    text: "!text-orange-300",
  },
  {
    min: 45,
    max: 55,
    label: "เป็นกลาง",
    emoji: "😐",
    bg: "!bg-zinc-700/60",
    text: "!text-zinc-300",
  },
  {
    min: 55,
    max: 75,
    label: "โลภ",
    emoji: "😊",
    bg: "!bg-emerald-900/60",
    text: "!text-emerald-300",
  },
  {
    min: 75,
    max: 101,
    label: "โลภขั้นสุด",
    emoji: "🤑",
    bg: "!bg-emerald-800/70 animate-pulse",
    text: "!text-emerald-200",
  },
];

// Gauge segments match FEAR_GREED_MAP ranges exactly
const GAUGE_SEGMENTS = [
  { labelTh: "กลัว\nขั้นสุด", color: "#b91c1c", from: 0, to: 25 },
  { labelTh: "กลัว", color: "#f97316", from: 25, to: 45 },
  { labelTh: "เป็นกลาง", color: "#a3a3a3", from: 45, to: 55 },
  { labelTh: "โลภ", color: "#86efac", from: 55, to: 75 },
  { labelTh: "โลภ\nขั้นสุด", color: "#16a34a", from: 75, to: 100 },
];

/* =======================
   Helpers (exportable)
======================= */

export function getFearGreedConfig(value: number): FearGreedConfig {
  return (
    FEAR_GREED_MAP.find((r) => value >= r.min && value < r.max) ??
    FEAR_GREED_MAP[0]
  );
}

export function mapFearGreed(value: number) {
  const { emoji, label } = getFearGreedConfig(value);
  return `${emoji} ${label} (${fNumber(value, { decimalNumber: 0 })})`;
}

export const getFearGreedBg = (value: number) => getFearGreedConfig(value).bg;
export const getFearGreedText = (value: number) =>
  getFearGreedConfig(value).text;

/* =======================
   Modal Component
======================= */

type Props = {
  value: number;
  onClose: () => void;
};

export function FearGreedGauge({ value, onClose }: Props) {
  const { label, emoji } = getFearGreedConfig(value);

  // Needle: value 0 → -90deg (far left), value 100 → +90deg (far right)
  const angle = -90 + (value / 100) * 180;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const cx = 110;
  const cy = 118;
  const r1 = 52;
  const r2 = 90;

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 flex items-center justify-center z-[1000]"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="relative rounded-3xl"
        style={{
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "32px 28px 28px",
          width: "min(340px, 92vw)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 pb-1 right-4 flex items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer border-0"
          style={{
            background: "rgba(255,255,255,0.08)",
            width: 30,
            height: 30,
            fontSize: 18,
          }}
        >
          ×
        </button>

        {/* Title */}
        <p className="text-center text-xs tracking-widest uppercase text-white/40 mb-3">
          ดัชนีความกลัวและความโลภ
        </p>

        {/* SVG Gauge */}
        <svg viewBox="0 0 220 130" className="w-full overflow-visible">
          {GAUGE_SEGMENTS.map((seg, i) => {
            const gap = 1.8;
            const startAngle = -180 + (seg.from / 100) * 180;
            const endAngle = -180 + (seg.to / 100) * 180;
            const sa = toRad(startAngle + gap);
            const ea = toRad(endAngle - gap);

            const x1 = cx + r2 * Math.cos(sa);
            const y1 = cy + r2 * Math.sin(sa);
            const x2 = cx + r2 * Math.cos(ea);
            const y2 = cy + r2 * Math.sin(ea);
            const x3 = cx + r1 * Math.cos(ea);
            const y3 = cy + r1 * Math.sin(ea);
            const x4 = cx + r1 * Math.cos(sa);
            const y4 = cy + r1 * Math.sin(sa);

            const isActive =
              value >= seg.from && value < (seg.to === 100 ? 101 : seg.to);

            const midAngle = toRad(
              -180 + ((seg.from + seg.to) / 2 / 100) * 180,
            );
            const labelR = r2 + 16;
            const lx = cx + labelR * Math.cos(midAngle);
            const ly = cy + labelR * Math.sin(midAngle);
            const lines = seg.labelTh.split("\n");

            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} A${r2},${r2} 0 0,1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0,0 ${x4},${y4} Z`}
                  fill={seg.color}
                  opacity={isActive ? 1 : 0.18}
                />
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={lx}
                    y={ly + li * 8 - (lines.length > 1 ? 4 : 0)}
                    textAnchor="middle"
                    fill={isActive ? seg.color : "rgba(255,255,255,0.25)"}
                    fontSize="6.5"
                    fontWeight={isActive ? "700" : "500"}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Tick marks matching segment boundaries */}
          {[0, 25, 45, 55, 75, 100].map((v) => {
            const tickAngle = toRad(-180 + (v / 100) * 180);
            const tx1 = cx + (r1 - 6) * Math.cos(tickAngle);
            const ty1 = cy + (r1 - 6) * Math.sin(tickAngle);
            const tx2 = cx + (r1 - 1) * Math.cos(tickAngle);
            const ty2 = cy + (r1 - 1) * Math.sin(tickAngle);
            const lx = cx + (r1 - 14) * Math.cos(tickAngle);
            const ly = cy + (r1 - 14) * Math.sin(tickAngle);
            return (
              <g key={v}>
                <line
                  x1={tx1}
                  y1={ty1}
                  x2={tx2}
                  y2={ty2}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
                <text
                  x={lx}
                  y={ly + 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.35)"
                  fontSize="6"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Needle */}
          <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
            <line
              x1="0"
              y1="6"
              x2="0"
              y2="-68"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="5" fill="white" />
            <circle cx="0" cy="0" r="2.5" fill="#0f0f0f" />
          </g>
        </svg>

        {/* Value + Emoji + Label */}
        <div className="text-center mt-2 space-y-1">
          <div className="text-4xl font-bold text-white">
            {Math.round(value)} <span>{emoji}</span>
          </div>
          <div className="text-lg font-bold text-white tracking-wide">
            {label}
          </div>
          <div className="text-xs text-white/35">
            คะแนน {Math.round(value)} จาก 100
          </div>
        </div>
      </div>
    </div>
  );
}
