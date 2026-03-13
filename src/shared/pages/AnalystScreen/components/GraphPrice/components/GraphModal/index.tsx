"use client";

import React, { useEffect, useRef, useState } from "react";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName } from "@/app/lib/utils";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { BarProps } from "recharts";

type BarShapeProps = BarProps & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

/* =======================
   Types
======================= */

type GraphPoint = {
  time: number;
  price: number;
};

type GraphData = {
  base: number;
  shortName: string;
  data: GraphPoint[];
};

type PrePostData = {
  currentPrice: number | null;
  regularMarketPrice: number | null;
  previousClose: number | null;
  session: "pre" | "regular" | "post" | "closed";
  changePercent: number | null;
  prePostChangePercent: number | null;
  latestTimestamp: number | null;
};

type CandleEntry = {
  time: number;
  open: number;
  close: number;
  high: number;
  low: number;
  isUp: boolean;
};

type StockDetailModalProps = {
  asset: Asset;
  graph: GraphData;
  currentPrice: number | null;
  prevPrice: number | null;
  prePostData: PrePostData | null;
  onClose: () => void;
};

/* =======================
   Helpers
======================= */

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Always returns a displayable string — never undefined */
function fmt(value: number | null | undefined): string {
  return fNumber(value ?? 0) ?? "—";
}

function signedFmt(val: number | null, pct = false): string {
  if (val == null) return "—";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${fmt(val)}${pct ? "%" : ""}`;
}

function buildCandleData(data: GraphPoint[]): CandleEntry[] {
  if (!data || data.length < 2) return [];
  const bucketSize = Math.max(Math.ceil(data.length / 40), 1);
  const result: CandleEntry[] = [];
  for (let i = 0; i < data.length; i += bucketSize) {
    const pts = data.slice(i, i + bucketSize);
    const open = pts[0].price;
    const close = pts[pts.length - 1].price;
    const high = Math.max(...pts.map((p) => p.price));
    const low = Math.min(...pts.map((p) => p.price));
    result.push({
      time: pts[Math.floor(pts.length / 2)].time,
      open,
      close,
      high,
      low,
      isUp: close >= open,
    });
  }
  return result;
}

/* =======================
   Sub-components
======================= */

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.45)",
          fontFamily: "monospace",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "monospace",
          color: valueColor ?? "rgba(255,255,255,0.9)",
          letterSpacing: "0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "rgba(255,255,255,0.3)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        margin: "16px 0 4px",
      }}
    >
      {children}
    </div>
  );
}

/* =======================
   Candlestick Shape
   Recharts passes Bar props directly — no `payload` wrapper.
   We type the props as an intersection of Recharts geometry + our data.
======================= */

type CandlestickShapeProps = Partial<CandleEntry> & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function CandlestickShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  open = 0,
  close = 0,
  high = 0,
  low = 0,
  isUp = true,
}: CandlestickShapeProps) {
  const color = isUp ? "#26a69a" : "#ef5350";
  const allP = [open, close, high, low];
  const minP = Math.min(...allP);
  const maxP = Math.max(...allP);
  const range = maxP - minP || 1;
  const toY = (p: number) => y + ((maxP - p) / range) * height;
  const bodyTop = toY(Math.max(open, close));
  const bodyBot = toY(Math.min(open, close));
  const bodyH = Math.max(bodyBot - bodyTop, 1);
  const cx = x + width / 2;
  const wickW = Math.max(width * 0.15, 1);

  return (
    <g>
      <rect x={cx - wickW / 2} y={toY(high)} width={wickW} height={Math.max(bodyTop - toY(high), 0)} fill={color} />
      <rect x={x + 1} y={bodyTop} width={Math.max(width - 2, 1)} height={bodyH} fill={color} rx={1} />
      <rect x={cx - wickW / 2} y={bodyBot} width={wickW} height={Math.max(toY(low) - bodyBot, 0)} fill={color} />
    </g>
  );
}

/* =======================
   Modal
======================= */

export function StockDetailModal({
  asset,
  graph,
  currentPrice,
  prevPrice,
  prePostData,
  onClose,
}: StockDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      setVisible(false);
      setTimeout(onClose, 250);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const symbol = asset.symbol;
  const percentChange =
    prevPrice && currentPrice
      ? ((currentPrice - prevPrice) / prevPrice) * 100
      : 0;
  const priceChange =
    currentPrice != null && prevPrice != null ? currentPrice - prevPrice : 0;
  const isUp = percentChange >= 0;
  const color = isUp ? "#26a69a" : "#ef5350";

  const candleData = buildCandleData(graph.data);

  const pp = prePostData;
  const hasPrePost = pp && pp.session !== "regular" && pp.session !== "closed";
  const ppChange = pp?.prePostChangePercent ?? null;

  const sessionLabel: Record<PrePostData["session"], string> = {
    pre: "Pre-Market",
    post: "After Hours",
    regular: "Regular",
    closed: "Closed",
  };

  const holdingValue = asset.quantity * asset.costPerShare;
  const currentValue =
    currentPrice != null ? asset.quantity * currentPrice : null;
  const profitLoss =
    currentValue != null ? currentValue - holdingValue : null;
  const profitPct =
    profitLoss != null && holdingValue !== 0
      ? (profitLoss / holdingValue) * 100
      : null;

  const minPrice = graph.data.length
    ? Math.min(...graph.data.map((d) => d.price))
    : null;
  const maxPrice = graph.data.length
    ? Math.max(...graph.data.map((d) => d.price))
    : null;

  const firstTime = graph.data.length ? graph.data[0].time : null;
  const lastTime = graph.data.length
    ? graph.data[graph.data.length - 1].time
    : null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          maxHeight: "90vh",
          background: "#0f0f0f",
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          overflowY: "auto",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          scrollbarWidth: "none",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 99 }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                ...(getLogo(symbol)
                  ? { backgroundImage: `url(${getLogo(symbol)})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { backgroundColor: "#fff" }),
                border: "1px solid rgba(255,255,255,0.12)",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.01em" }}>
                {getName(symbol)}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {graph.shortName}
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Price block */}
        <div style={{ padding: "0 20px 20px" }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "monospace",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {fmt(pp?.regularMarketPrice ?? currentPrice)}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <div
              style={{
                background: isUp ? "rgba(38,166,154,0.15)" : "rgba(239,83,80,0.15)",
                border: `1px solid ${isUp ? "rgba(38,166,154,0.3)" : "rgba(239,83,80,0.3)"}`,
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 13,
                fontWeight: 700,
                color,
                fontFamily: "monospace",
              }}
            >
              {signedFmt(priceChange)} ({signedFmt(percentChange, true)})
            </div>

            {pp && (
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {sessionLabel[pp.session]}
              </div>
            )}
          </div>

          {hasPrePost && ppChange != null && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {pp!.session === "pre" ? "Pre-Market" : "After Hours"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: "#fff", marginTop: 2 }}>
                  {fmt(pp!.currentPrice)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: ppChange >= 0 ? "#26a69a" : "#ef5350",
                }}
              >
                {signedFmt(ppChange, true)}
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ padding: "0 8px 4px" }}>
          <div style={{ height: 200, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candleData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <YAxis
                  hide
                  domain={[(min: number) => min * 0.998, (max: number) => max * 1.002]}
                />
                <XAxis dataKey="time" hide />
                <ReferenceLine y={prevPrice ?? 0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                <Bar
                  dataKey="close"
                  shape={(props: any) => (
                    <CandlestickShape
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      open={props.open}
                      close={props.close}
                      high={props.high}
                      low={props.low}
                      isUp={props.isUp}
                    />
                  )}
                  isAnimationActive={false}
                >
                  {candleData.map((entry, i) => (
                    <Cell key={i} fill={entry.isUp ? "#26a69a" : "#ef5350"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {firstTime != null && lastTime != null && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 12px",
                fontSize: 10,
                color: "rgba(255,255,255,0.25)",
                fontFamily: "monospace",
              }}
            >
              <span>{formatTime(firstTime)}</span>
              <span>{formatDate(lastTime)}</span>
              <span>{formatTime(lastTime)}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ margin: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }} />

        {/* Stats */}
        <div style={{ padding: "0 20px 20px" }}>
          <SectionLabel>ราคาวันนี้</SectionLabel>
          <StatRow label="ราคาปัจจุบัน" value={fmt(currentPrice)} />
          <StatRow label="ราคาปิดก่อนหน้า" value={fmt(prevPrice)} />
          <StatRow label="เปลี่ยนแปลง" value={signedFmt(priceChange)} valueColor={color} />
          <StatRow label="% เปลี่ยนแปลง" value={signedFmt(percentChange, true)} valueColor={color} />
          <StatRow label="สูงสุดวันนี้" value={fmt(maxPrice)} />
          <StatRow label="ต่ำสุดวันนี้" value={fmt(minPrice)} />

          <SectionLabel>พอร์ตฉัน</SectionLabel>
          <StatRow label="จำนวนหุ้น" value={`${asset.quantity} หุ้น`} />
          <StatRow label="ต้นทุนเฉลี่ย" value={fmt(asset.costPerShare)} />
          <StatRow label="มูลค่าต้นทุน" value={fmt(holdingValue)} />
          <StatRow label="มูลค่าปัจจุบัน" value={fmt(currentValue)} />
          <StatRow
            label="กำไร / ขาดทุน"
            value={signedFmt(profitLoss)}
            valueColor={profitLoss == null ? undefined : profitLoss >= 0 ? "#26a69a" : "#ef5350"}
          />
          <StatRow
            label="% กำไร / ขาดทุน"
            value={signedFmt(profitPct, true)}
            valueColor={profitPct == null ? undefined : profitPct >= 0 ? "#26a69a" : "#ef5350"}
          />

          {pp && pp.session !== "regular" && (
            <>
              <SectionLabel>
                {pp.session === "pre" ? "Pre-Market" : pp.session === "post" ? "After Hours" : "ตลาดปิด"}
              </SectionLabel>
              {pp.session !== "closed" && (
                <>
                  <StatRow label="ราคา Pre/Post" value={fmt(pp.currentPrice)} />
                  <StatRow
                    label="% เปลี่ยนแปลง"
                    value={signedFmt(ppChange, true)}
                    valueColor={ppChange == null ? undefined : ppChange >= 0 ? "#26a69a" : "#ef5350"}
                  />
                </>
              )}
              <StatRow label="ราคาปิดตลาด" value={fmt(pp.regularMarketPrice)} />
              <StatRow label="ราคาปิดก่อนหน้า" value={fmt(pp.previousClose)} />
            </>
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}