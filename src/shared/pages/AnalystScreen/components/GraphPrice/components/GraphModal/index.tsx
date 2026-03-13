"use client";

import React, { useEffect, useRef, useState } from "react";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName, isThaiStock } from "@/app/lib/utils";

/* =======================
   Types
======================= */

type GraphPoint = { time: number; price: number };
type GraphData = { base: number; shortName: string; data: GraphPoint[] };
type PrePostData = {
  currentPrice: number | null;
  regularMarketPrice: number | null;
  previousClose: number | null;
  session: "pre" | "regular" | "post" | "closed";
  changePercent: number | null;
  prePostChangePercent: number | null;
  latestTimestamp: number | null;
};
type HACandle = {
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
  currencyRate: number;
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

function fmt(value: number | null | undefined): string {
  if (value == null) return "—";
  return fNumber(value) ?? "—";
}

function fmtUsd(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${fNumber(value) ?? "—"} USD`;
}

function signedFmt(val: number | null, pct = false, usd = false): string {
  if (val == null) return "—";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${fmt(val)}${pct ? "%" : usd ? " USD" : ""}`;
}

function toBaht(usd: number | null | undefined, rate: number): string {
  if (usd == null) return "—";
  return `${fNumber(usd * rate) ?? "—"} บาท`;
}

function buildHeikinAshi(data: GraphPoint[]): HACandle[] {
  if (!data || data.length < 2) return [];
  const bucketSize = Math.max(Math.ceil(data.length / 60), 1);
  const buckets: GraphPoint[][] = [];
  for (let i = 0; i < data.length; i += bucketSize)
    buckets.push(data.slice(i, i + bucketSize));
  const raw = buckets.map((pts) => ({
    time: pts[Math.floor(pts.length / 2)].time,
    open: pts[0].price,
    close: pts[pts.length - 1].price,
    high: Math.max(...pts.map((p) => p.price)),
    low: Math.min(...pts.map((p) => p.price)),
  }));
  const ha: HACandle[] = [];
  raw.forEach((c, i) => {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen =
      i === 0 ? (c.open + c.close) / 2 : (ha[i - 1].open + ha[i - 1].close) / 2;
    ha.push({
      time: c.time,
      open: haOpen,
      close: haClose,
      high: Math.max(c.high, haOpen, haClose),
      low: Math.min(c.low, haOpen, haClose),
      isUp: haClose >= haOpen,
    });
  });
  return ha;
}

/* =======================
   SVG Heikin-Ashi Chart
======================= */

function HAChart({
  data,
  prevPrice,
}: {
  data: HACandle[];
  prevPrice: number | null;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    candle: HACandle;
  } | null>(null);

  if (!data.length) return null;

  const W = 380;
  const H = 180;
  const PAD = { top: 8, bottom: 8, left: 2, right: 2 };

  const allPrices = data.flatMap((c) => [c.high, c.low]);
  if (prevPrice) allPrices.push(prevPrice);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toY = (p: number) => PAD.top + ((maxP - p) / range) * chartH;
  const n = data.length;
  const gap = 1.5;
  const candleW = Math.max(chartW / n - gap, 2);
  const step = chartW / n;

  const refY = prevPrice ? toY(prevPrice) : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: H, display: "block" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Reference line */}
        {refY !== null && (
          <line
            x1={PAD.left}
            y1={refY}
            x2={W - PAD.right}
            y2={refY}
            stroke="rgba(255,198,0,0.25)"
            strokeWidth={0.8}
            strokeDasharray="4 3"
          />
        )}

        {/* Candles */}
        {data.map((c, i) => {
          const cx = PAD.left + i * step + step / 2;
          const bodyTop = toY(Math.max(c.open, c.close));
          const bodyBot = toY(Math.min(c.open, c.close));
          const bodyH = Math.max(bodyBot - bodyTop, 1.5);
          const color = c.isUp ? "#4ade80" : "#f87171";
          const wickX = cx;
          const x = cx - candleW / 2;

          return (
            <g
              key={i}
              onMouseEnter={(e) => {
                const rect = (
                  e.currentTarget.ownerSVGElement as SVGElement
                ).getBoundingClientRect();
                setTooltip({ x: (cx / W) * 100, y: bodyTop, candle: c });
              }}
            >
              {/* upper wick */}
              <line
                x1={wickX}
                y1={toY(c.high)}
                x2={wickX}
                y2={bodyTop}
                stroke={color}
                strokeWidth={1.2}
              />
              {/* body */}
              <rect
                x={x}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={color}
                rx={0.5}
              />
              {/* lower wick */}
              <line
                x1={wickX}
                y1={bodyBot}
                x2={wickX}
                y2={toY(c.low)}
                stroke={color}
                strokeWidth={1.2}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: tooltip.x > 60 ? undefined : `${tooltip.x}%`,
            right: tooltip.x > 60 ? `${100 - tooltip.x}%` : undefined,
            background: "#1a1a1a",
            border: "1px solid rgba(255,198,0,0.2)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#fff",
            pointerEvents: "none",
            zIndex: 10,
            minWidth: 90,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              marginBottom: 3,
              fontSize: 10,
            }}
          >
            {formatTime(tooltip.candle.time)}
          </div>
          {(["open", "high", "low", "close"] as const).map((k) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  fontSize: 10,
                }}
              >
                {k}
              </span>
              <span
                style={{
                  color:
                    k === "close"
                      ? tooltip.candle.isUp
                        ? "#4ade80"
                        : "#f87171"
                      : "#fff",
                  fontWeight: k === "close" ? 700 : 400,
                }}
              >
                {fmt(tooltip.candle[k])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =======================
   StatRow
======================= */

function StatRow({
  label,
  value,
  subValue,
  signed,
}: {
  label: string;
  value: string;
  subValue?: string;
  signed?: boolean; // if true, apply green/red class based on leading + or -
}) {
  const isPositive = signed && value.startsWith("+");
  const isNegative = signed && value.startsWith("-");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 0",
        borderBottom: "1px solid rgba(255,198,0,0.06)",
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
        {label}
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
        }}
      >
        <span
          className={
            isPositive ? "!text-green-500" : isNegative ? "!text-red-500" : ""
          }
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "monospace",
            color: !signed ? "rgba(255,255,255,0.9)" : undefined,
          }}
        >
          {value}
        </span>
        {subValue && (
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.28)",
            }}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        margin: "18px 0 2px",
        fontFamily: "monospace",
      }}
      className="!text-yellow-500 opacity-60"
    >
      {children}
    </div>
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
  currencyRate,
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
      setTimeout(onClose, 200);
    }
  };
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const symbol = asset.symbol;
  const isThai = isThaiStock(symbol);
  const percentChange =
    prevPrice && currentPrice
      ? ((currentPrice - prevPrice) / prevPrice) * 100
      : 0;
  const priceChange =
    currentPrice != null && prevPrice != null ? currentPrice - prevPrice : 0;
  const isUp = percentChange >= 0;

  const haData = buildHeikinAshi(graph.data);

  const pp = prePostData;
  const hasPrePost = pp && pp.session !== "regular" && pp.session !== "closed";
  const ppChange = pp?.prePostChangePercent ?? null;
  const sessionLabel: Record<PrePostData["session"], string> = {
    pre: "ก่อน",
    post: "หลัง",
    regular: "ปกติ",
    closed: "ปิด",
  };

  const holdingValue = asset.quantity * asset.costPerShare;
  const currentValue =
    currentPrice != null ? asset.quantity * currentPrice : null;
  const profitLoss = currentValue != null ? currentValue - holdingValue : null;
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
      className="fixed inset-0 flex items-center justify-center !z-[100] p-4 backdrop-blur-sm"
      style={{
        background: "rgba(0,0,0,0.82)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        className="bg-black rounded-2xl w-full max-w-[440px] flex flex-col overflow-hidden border border-accent-yellow border-opacity-20 shadow-2xl"
        style={{
          maxHeight: "88vh",
          transform: visible ? "scale(1)" : "scale(0.95)",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-accent-yellow border-opacity-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-accent-yellow border-opacity-20 flex items-center justify-center shrink-0 bg-black">
              {getLogo(symbol) ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${getLogo(symbol)})` }}
                />
              ) : (
                <span className="text-accent-yellow text-sm font-bold">
                  {symbol.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-bold text-base leading-tight">
                  {getName(symbol)}
                </h2>
                {hasPrePost && ppChange != null && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${ppChange >= 0 ? "!text-green-500" : "!text-red-500"}`}
                    style={{
                      background:
                        ppChange >= 0
                          ? "rgba(74,222,128,0.1)"
                          : "rgba(248,113,113,0.1)",
                      border: `1px solid ${ppChange >= 0 ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                    }}
                  >
                    {sessionLabel[pp!.session]} {signedFmt(ppChange, true)}
                  </span>
                )}
              </div>
              <p className="text-accent-yellow text-opacity-40 text-xs truncate max-w-[200px] mt-0.5">
                {graph.shortName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white bg-opacity-5 border border-white border-opacity-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div
          className="overflow-y-auto flex-1 px-5"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Price */}
          <div className="py-4 border-b border-accent-yellow border-opacity-10">
            <div className="flex items-end gap-3 flex-wrap">
              <div
                className="text-white font-bold"
                style={{
                  fontSize: 34,
                  fontFamily: "monospace",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {isThai
                  ? fmt(pp?.regularMarketPrice ?? currentPrice)
                  : fmtUsd(pp?.regularMarketPrice ?? currentPrice)}
              </div>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full mb-0.5 font-mono ${isUp ? "!text-green-500" : "!text-red-500"}`}
                style={{
                  background: isUp
                    ? "rgba(74,222,128,0.1)"
                    : "rgba(248,113,113,0.1)",
                  border: `1px solid ${isUp ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                }}
              >
                {signedFmt(priceChange, false, !isThai)} (
                {signedFmt(percentChange, true)})
              </span>
            </div>
            {!isThai && (
              <div
                className="mt-1 text-xs font-mono"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                ≈ {toBaht(pp?.regularMarketPrice ?? currentPrice, currencyRate)}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="py-3 border-b border-accent-yellow border-opacity-10">
            <HAChart data={haData} prevPrice={prevPrice} />
          </div>

          {/* Stats */}
          <div className="pb-5">
            <SectionLabel>ราคาวันนี้</SectionLabel>
            <StatRow
              label="ราคาปัจจุบัน"
              value={isThai ? fmt(currentPrice) : fmtUsd(currentPrice)}
              subValue={
                !isThai ? toBaht(currentPrice, currencyRate) : undefined
              }
            />
            <StatRow
              label="ราคาปิดก่อนหน้า"
              value={isThai ? fmt(prevPrice) : fmtUsd(prevPrice)}
              subValue={!isThai ? toBaht(prevPrice, currencyRate) : undefined}
            />
            <StatRow
              label="เปลี่ยนแปลง"
              value={signedFmt(priceChange, false, !isThai)}
              signed
            />
            <StatRow
              label="% เปลี่ยนแปลง"
              value={signedFmt(percentChange, true)}
              signed
            />
            <StatRow
              label="สูงสุดวันนี้"
              value={isThai ? fmt(maxPrice) : fmtUsd(maxPrice)}
              subValue={!isThai ? toBaht(maxPrice, currencyRate) : undefined}
            />
            <StatRow
              label="ต่ำสุดวันนี้"
              value={isThai ? fmt(minPrice) : fmtUsd(minPrice)}
              subValue={!isThai ? toBaht(minPrice, currencyRate) : undefined}
            />

            <SectionLabel>พอร์ตฉัน</SectionLabel>
            <StatRow label="จำนวนหุ้น" value={`${asset.quantity} หุ้น`} />
            <StatRow
              label="ต้นทุนเฉลี่ย"
              value={
                isThai ? fmt(asset.costPerShare) : fmtUsd(asset.costPerShare)
              }
              subValue={
                !isThai ? toBaht(asset.costPerShare, currencyRate) : undefined
              }
            />
            <StatRow
              label="มูลค่าต้นทุน"
              value={isThai ? fmt(holdingValue) : fmtUsd(holdingValue)}
              subValue={
                !isThai ? toBaht(holdingValue, currencyRate) : undefined
              }
            />
            <StatRow
              label="มูลค่าปัจจุบัน"
              value={isThai ? fmt(currentValue) : fmtUsd(currentValue)}
              subValue={
                !isThai ? toBaht(currentValue, currencyRate) : undefined
              }
            />
            <StatRow
              label="กำไร / ขาดทุน"
              value={signedFmt(profitLoss, false, !isThai)}
              subValue={
                !isThai && profitLoss != null
                  ? `${profitLoss >= 0 ? "+" : ""}${toBaht(profitLoss, currencyRate)}`
                  : undefined
              }
              signed
            />
            <StatRow
              label="% กำไร / ขาดทุน"
              value={signedFmt(profitPct, true)}
              signed
            />

            {pp && pp.session !== "regular" && (
              <>
                <SectionLabel>
                  {pp.session === "pre"
                    ? "ก่อนตลาดเปิด"
                    : pp.session === "post"
                      ? "หลังตลาดปิด"
                      : "ตลาดปิด"}
                </SectionLabel>
                {pp.session !== "closed" && (
                  <>
                    <StatRow
                      label="ราคา ก่อน/หลัง"
                      value={
                        isThai ? fmt(pp.currentPrice) : fmtUsd(pp.currentPrice)
                      }
                      subValue={
                        !isThai
                          ? toBaht(pp.currentPrice, currencyRate)
                          : undefined
                      }
                    />
                    <StatRow
                      label="% เปลี่ยนแปลง"
                      value={signedFmt(ppChange, true)}
                      signed
                    />
                  </>
                )}
                <StatRow
                  label="ราคาปิดตลาด"
                  value={
                    isThai
                      ? fmt(pp.regularMarketPrice)
                      : fmtUsd(pp.regularMarketPrice)
                  }
                  subValue={
                    !isThai
                      ? toBaht(pp.regularMarketPrice, currencyRate)
                      : undefined
                  }
                />
                <StatRow
                  label="ราคาปิดก่อนหน้า"
                  value={
                    isThai ? fmt(pp.previousClose) : fmtUsd(pp.previousClose)
                  }
                  subValue={
                    !isThai ? toBaht(pp.previousClose, currencyRate) : undefined
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
