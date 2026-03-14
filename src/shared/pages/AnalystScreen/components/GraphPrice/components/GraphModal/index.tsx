"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName, isThaiStock } from "@/app/lib/utils";
import { TimeRange } from "@/app/api/chart-history/route";
import { AUTO_REFRESH_1M_INTERVAL_MS } from "@/app/config";
import { usePageVisible } from "@/shared/hooks/usePageVisible";
import { useMarketStore } from "@/store/useMarketStore";

/* =======================
   Types
======================= */

type GraphPoint = { time: number; price: number };
type PrePostData = {
  currentPrice: number | null;
  regularMarketPrice: number | null;
  previousClose: number | null;
  session: "pre" | "regular" | "post" | "closed";
  changePercent: number | null;
  prePostChangePercent: number | null;
  latestTimestamp: number | null;
};

type ChartHistoryPoint = {
  time: number;
  price: number;
  high: number;
  low: number;
  open: number;
  volume: number;
};

type ChartHistoryResponse = {
  symbol: string;
  range: TimeRange;
  previousClose: number | null;
  shortName: string;
  currency: string;
  data: ChartHistoryPoint[];
};

type HACandle = {
  time: number;
  open: number;
  close: number;
  high: number;
  low: number;
  isUp: boolean;
};

// ─── Props now accept store-sourced prices so % is always consistent ─────────
type StockDetailModalProps = {
  symbol: string;
  asset?: Asset | null;
  onClose: () => void;
  currencyRate: number;
  /** Pass prices[symbol] from useMarketStore — used as the display price */
  storeCurrentPrice?: number | null;
  /** Pass previousPrice[symbol] from useMarketStore — used for % change calc */
  storePreviousPrice?: number | null;
};

const TIMEFRAMES: { label: string; value: TimeRange }[] = [
  { label: "นาที", value: "1m" },
  { label: "วัน", value: "1d" },
  { label: "สัปดาห์", value: "5d" },
  { label: "เดือน", value: "1mo" },
];

function formatTime(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === "1m")
    return d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (range === "1h")
    return d.toLocaleTimeString("th-TH", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (range === "1d")
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  if (range === "5d")
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
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

const TARGET_CANDLES_BY_RANGE: Record<TimeRange, number> = {
  "1m": 9999,
  "1h": 9999,
  "1d": 30,
  "5d": 26,
  "1mo": 24,
};

function buildHeikinAshi(
  data: {
    time: number;
    price: number;
    open?: number;
    high?: number;
    low?: number;
  }[],
  targetCandles = 30,
): HACandle[] {
  if (!data || data.length < 2) return [];
  const bucketSize = Math.max(Math.floor(data.length / targetCandles), 1);
  const buckets: (typeof data)[] = [];
  for (let i = 0; i < data.length; i += bucketSize)
    buckets.push(data.slice(i, i + bucketSize));
  const raw = buckets.map((pts) => ({
    time: pts[Math.floor(pts.length / 2)].time,
    open: pts[0].open ?? pts[0].price,
    close: pts[pts.length - 1].price,
    high: pts[0].high ?? Math.max(...pts.map((p) => p.price)),
    low: pts[0].low ?? Math.min(...pts.map((p) => p.price)),
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
   HAChart
======================= */

function HAChart({
  data,
  rawData,
  prevPrice,
  currentPrice,
  range,
  isLoading,
}: {
  data: HACandle[];
  rawData: ChartHistoryPoint[];
  prevPrice: number | null;
  currentPrice: number | null;
  range: TimeRange;
  isLoading: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [crosshair, setCrosshair] = useState<{
    x: number;
    idx: number;
  } | null>(null);

  const W = 380;
  // ── Layout: price chart on top, volume panel below, time axis at bottom ──
  const VOL_H = 32; // height of volume panel
  const AXIS_H = 20; // height of time axis
  const RANGE_BAR_H = 14; // height of day-range bar strip
  const CHART_H = 160; // height of price area
  const H = CHART_H + VOL_H + AXIS_H + RANGE_BAR_H;
  const PAD = { top: 8, left: 48, right: 4 };

  // derived Y zones
  const priceTop = PAD.top;
  const priceBot = priceTop + CHART_H;
  const volTop = priceBot + 2;
  const volBot = volTop + VOL_H;
  const rangeBarY = volBot + 3;
  const axisY = rangeBarY + RANGE_BAR_H + 4;

  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          height: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px solid rgba(255,198,0,0.15)",
            borderTopColor: "rgba(255,198,0,0.7)",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div
        style={{
          width: "100%",
          height: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.2)",
          fontSize: 13,
        }}
      >
        ไม่มีข้อมูล
      </div>
    );
  }

  // ── Price scale ──────────────────────────────────────────────────────────
  const allPrices = data.flatMap((c) => [c.high, c.low]);
  if (prevPrice) allPrices.push(prevPrice);
  if (currentPrice) allPrices.push(currentPrice);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const priceRange = maxP - minP || 1;
  const chartW = W - PAD.left - PAD.right;
  const toY = (p: number) => priceTop + ((maxP - p) / priceRange) * CHART_H;

  // ── Candle layout ────────────────────────────────────────────────────────
  const n = data.length;
  const gap = 1.5;
  const candleW = Math.max(chartW / n - gap, 2);
  const step = chartW / n;
  const cx = (i: number) => PAD.left + i * step + step / 2;

  // ── Volume scale ─────────────────────────────────────────────────────────
  const volumes = rawData.map((d) => d.volume ?? 0);
  const maxVol = Math.max(...volumes, 1);
  // map volume index → HACandle index (same bucketing logic, approximate)
  const bucketSize = Math.max(Math.floor(rawData.length / n), 1);
  const bucketedVol = Array.from({ length: n }, (_, i) => {
    const slice = rawData.slice(i * bucketSize, (i + 1) * bucketSize);
    return slice.reduce((s, d) => s + (d.volume ?? 0), 0);
  });
  const maxBucketVol = Math.max(...bucketedVol, 1);

  // ── Previous close line ──────────────────────────────────────────────────
  const prevY = prevPrice ? toY(prevPrice) : null;

  // ── Current price line ───────────────────────────────────────────────────
  const curY = currentPrice ? toY(currentPrice) : null;
  const isUp =
    currentPrice != null && prevPrice != null
      ? currentPrice >= prevPrice
      : true;
  const accentColor = isUp ? "#4ade80" : "#f87171";

  // ── Day range (from raw data) ────────────────────────────────────────────
  const dayLow = rawData.length
    ? Math.min(...rawData.map((d) => d.low ?? d.price))
    : null;
  const dayHigh = rawData.length
    ? Math.max(...rawData.map((d) => d.high ?? d.price))
    : null;

  // ── Grid ─────────────────────────────────────────────────────────────────
  const GRID_LINES = 4;
  const gridLevels = Array.from({ length: GRID_LINES }, (_, i) => {
    const price = minP + (priceRange * i) / (GRID_LINES - 1);
    return { price, y: toY(price) };
  });

  function fmtPrice(p: number): string {
    if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
    if (p >= 1_000) return `${(p / 1_000).toFixed(1)}K`;
    return p.toFixed(2);
  }

  // ── Time axis labels ─────────────────────────────────────────────────────
  const labelIndices = [0, 1, 2, 3, 4].map((i) =>
    Math.round((i / 4) * (n - 1)),
  );

  // ── Crosshair mouse handler ──────────────────────────────────────────────
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = svgX - PAD.left;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(relX / step)));
    setCrosshair({ x: cx(idx), idx });
  }

  // ── Crosshair candle data ────────────────────────────────────────────────
  const hoveredCandle = crosshair ? data[crosshair.idx] : null;

  // ── Gradient area path (midpoint of each candle close) ───────────────────
  const closePts = data.map((c, i) => ({ x: cx(i), y: toY(c.close) }));
  const areaPath =
    closePts.length > 1
      ? [
          `M ${closePts[0].x} ${priceBot}`,
          `L ${closePts[0].x} ${closePts[0].y}`,
          ...closePts.slice(1).map((p) => `L ${p.x} ${p.y}`),
          `L ${closePts[closePts.length - 1].x} ${priceBot}`,
          "Z",
        ].join(" ")
      : "";

  const gradId = `area-grad-${isUp ? "up" : "dn"}`;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* ── Crosshair OHLC badge (top of chart) ───────────────────────────── */}
      {hoveredCandle && (
        <div
          style={{
            position: "absolute",
            top: 2,
            left: PAD.left,
            right: PAD.right,
            display: "flex",
            gap: 8,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {(["open", "high", "low", "close"] as const).map((k) => (
            <span
              key={k}
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              <span
                style={{
                  color: "rgba(255,198,0,0.5)",
                  textTransform: "uppercase",
                }}
              >
                {k[0]}
              </span>
              <span
                style={{
                  color: k === "close" ? accentColor : "rgba(255,255,255,0.85)",
                  fontWeight: k === "close" ? 700 : 400,
                }}
              >
                {" "}
                {fmtPrice(hoveredCandle[k])}
              </span>
            </span>
          ))}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: H,
          display: "block",
          cursor: "crosshair",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCrosshair(null)}
      >
        <defs>
          {/* gradient fill under close line */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.18} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0.01} />
          </linearGradient>
          {/* clip price area */}
          <clipPath id="price-clip">
            <rect x={PAD.left} y={priceTop} width={chartW} height={CHART_H} />
          </clipPath>
          <clipPath id="vol-clip">
            <rect x={PAD.left} y={volTop} width={chartW} height={VOL_H} />
          </clipPath>
        </defs>

        {/* ── Grid lines ──────────────────────────────────────────────────── */}
        {gridLevels.map(({ price, y }, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left - 4}
              y={y + 3.5}
              textAnchor="end"
              fontSize={8.5}
              fill="rgba(255,255,255,0.25)"
              fontFamily="monospace"
            >
              {fmtPrice(price)}
            </text>
          </g>
        ))}

        {/* ── Gradient area under close line ──────────────────────────────── */}
        {areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradId})`}
            clipPath="url(#price-clip)"
          />
        )}

        {/* ── Candles ─────────────────────────────────────────────────────── */}
        <g clipPath="url(#price-clip)">
          {data.map((c, i) => {
            const x = cx(i);
            const bodyTop = toY(Math.max(c.open, c.close));
            const bodyBot = toY(Math.min(c.open, c.close));
            const bodyH = Math.max(bodyBot - bodyTop, 1.5);
            const color = c.isUp ? "#4ade80" : "#f87171";
            const isCrosshaired = crosshair?.idx === i;
            return (
              <g key={i} opacity={isCrosshaired ? 1 : 0.88}>
                {/* wick top */}
                <line
                  x1={x}
                  y1={toY(c.high)}
                  x2={x}
                  y2={bodyTop}
                  stroke={color}
                  strokeWidth={isCrosshaired ? 1.8 : 1.2}
                />
                {/* body */}
                <rect
                  x={x - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  fill={color}
                  rx={0.5}
                  opacity={c.isUp ? 0.9 : 0.75}
                />
                {/* wick bottom */}
                <line
                  x1={x}
                  y1={bodyBot}
                  x2={x}
                  y2={toY(c.low)}
                  stroke={color}
                  strokeWidth={isCrosshaired ? 1.8 : 1.2}
                />
              </g>
            );
          })}
        </g>

        {/* ── Current price dashed line ────────────────────────────────────── */}
        {curY !== null && (
          <g>
            <line
              x1={PAD.left}
              y1={curY}
              x2={W - PAD.right}
              y2={curY}
              stroke={accentColor}
              strokeWidth={0.8}
              strokeDasharray="3 3"
              opacity={0.9}
            />
            <rect
              x={PAD.left - 36}
              y={curY - 6}
              width={35}
              height={12}
              rx={3}
              fill={accentColor}
            />
            <text
              x={PAD.left - 4}
              y={curY + 3.5}
              textAnchor="end"
              fontSize={8}
              fill="black"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {fmtPrice(currentPrice!)}
            </text>
          </g>
        )}

        {/* ── Volume separator line ────────────────────────────────────────── */}
        <line
          x1={PAD.left}
          y1={volTop - 1}
          x2={W - PAD.right}
          y2={volTop - 1}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />

        {/* ── Volume bars ─────────────────────────────────────────────────── */}
        <g clipPath="url(#vol-clip)">
          {bucketedVol.map((vol, i) => {
            const barH = Math.max((vol / maxBucketVol) * VOL_H, 1);
            const color = data[i]?.isUp ? "#4ade80" : "#f87171";
            const isCrosshaired = crosshair?.idx === i;
            return (
              <rect
                key={i}
                x={cx(i) - candleW / 2}
                y={volBot - barH}
                width={candleW}
                height={barH}
                fill={color}
                opacity={isCrosshaired ? 0.7 : 0.28}
                rx={0.5}
              />
            );
          })}
        </g>

        {/* ── Crosshair vertical line ──────────────────────────────────────── */}
        {crosshair && (
          <line
            x1={crosshair.x}
            y1={priceTop}
            x2={crosshair.x}
            y2={volBot}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={0.8}
            strokeDasharray="2 3"
          />
        )}

        {/* ── Time axis ───────────────────────────────────────────────────── */}
        {labelIndices.map((idx) => {
          const x = cx(idx);
          const label = formatTime(data[idx].time, range);
          const anchor = idx === 0 ? "start" : idx === n - 1 ? "end" : "middle";
          return (
            <text
              key={idx}
              x={x}
              y={axisY}
              textAnchor={anchor}
              fontSize={9}
              fill="rgba(255,255,255,0.28)"
              fontFamily="monospace"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* =======================
   TimeframeChips
======================= */

function TimeframeChips({
  value,
  onChange,
  isLoading,
}: {
  value: TimeRange;
  onChange: (r: TimeRange) => void;
  isLoading: boolean;
}) {
  return (
    <div style={{ padding: "8px 0 4px" }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "monospace",
          color: "rgba(255,198,0,0.6)",
          marginBottom: 6,
        }}
      >
        กรอบเวลา
      </div>
      <div style={{ display: "flex", gap: 6, width: "100%" }}>
        {TIMEFRAMES.map((tf) => {
          const active = tf.value === value;
          return (
            <button
              key={tf.value}
              onClick={() => onChange(tf.value)}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                fontFamily: "monospace",
                border: active
                  ? "1px solid rgba(255,198,0,0.6)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: active
                  ? "rgba(255,198,0,0.15)"
                  : "rgba(255,255,255,0.04)",
                color: active
                  ? "rgba(255,198,0,0.95)"
                  : "rgba(255,255,255,0.45)",
                cursor: isLoading ? "default" : "pointer",
                transition: "all 0.15s",
                outline: "none",
                opacity: isLoading && !active ? 0.5 : 1,
              }}
            >
              {tf.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =======================
   StatRow / SectionLabel
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
  signed?: boolean;
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
  onClose,
  currencyRate,
  symbol: symbolProp,
  storeCurrentPrice,
  storePreviousPrice,
}: StockDetailModalProps) {
  const [marketData, setMarketData] = useState<PrePostData | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState<TimeRange>("1m");
  const [chartHistory, setChartHistory] = useState<ChartHistoryResponse | null>(
    null,
  );
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [displayedRange, setDisplayedRange] = useState<TimeRange>("1m");
  const isMarketOpen = useMarketStore((s) => s.marketStatus?.isOpen ?? true);

  const fetchMarketData = useCallback(async () => {
    const res = await fetch(
      `/api/prepost?symbol=${encodeURIComponent(symbolProp)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const json = await res.json();
    setMarketData(json);
  }, [symbolProp]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const fetchChartHistory = useCallback(
    async (r: TimeRange) => {
      setIsLoadingChart(true);
      setChartError(null);
      try {
        const res = await fetch(
          `/api/chart-history?symbol=${encodeURIComponent(symbolProp)}&range=${r}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ChartHistoryResponse = await res.json();
        setChartHistory(json);
        setDisplayedRange(r);
      } catch (err) {
        console.error("chart-history fetch failed", err);
        setChartError("โหลดข้อมูลไม่ได้");
      } finally {
        setIsLoadingChart(false);
      }
    },
    [symbolProp],
  );

  useEffect(() => {
    fetchChartHistory(range);
  }, [range, fetchChartHistory]);

  const isPageVisible = usePageVisible();
  useEffect(() => {
    // ไม่ refresh chart ถ้าตลาดปิด, ไม่ใช่ timeframe นาที, หรือ tab ไม่ active
    if (range !== "1m" || !isPageVisible || !isMarketOpen) return;
    const id = setInterval(
      () => fetchChartHistory(range),
      AUTO_REFRESH_1M_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [range, fetchChartHistory, isPageVisible, isMarketOpen]);

  useEffect(() => {
    // ไม่ refresh prepost ถ้าตลาดปิด หรือ tab ไม่ active
    if (!isPageVisible || !isMarketOpen) return;
    const id = setInterval(
      () => fetchMarketData(),
      AUTO_REFRESH_1M_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [fetchMarketData, isPageVisible, isMarketOpen]);

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

  const symbol = symbolProp;
  const isThai = isThaiStock(symbol);
  const pp = marketData;

  // ─── Price resolution priority ────────────────────────────────────────────
  //
  // Display price:
  //   1. prepost regularMarketPrice (most accurate session price)
  //   2. storeCurrentPrice (from useMarketStore — same source as the row)
  //   3. prepost currentPrice
  //
  // % change — ALWAYS use store values so it matches the row exactly.
  //   Formula: (storeCurrentPrice - storePreviousPrice) / storePreviousPrice
  //   Fallback to prepost if store values are not available.

  const displayPrice =
    pp?.regularMarketPrice ?? storeCurrentPrice ?? pp?.currentPrice ?? null;

  // Use store prices for % calculation to stay in sync with the row
  const priceForPct =
    storeCurrentPrice ?? pp?.regularMarketPrice ?? pp?.currentPrice ?? null;
  const prevForPct = storePreviousPrice ?? pp?.previousClose ?? null;

  const percentChange =
    priceForPct != null && prevForPct != null && prevForPct !== 0
      ? ((priceForPct - prevForPct) / prevForPct) * 100
      : 0;

  const priceChange =
    priceForPct != null && prevForPct != null ? priceForPct - prevForPct : 0;

  const isUp = percentChange >= 0;

  // Pre/post session badge
  const hasPrePost = pp && pp.session !== "regular" && pp.session !== "closed";
  const ppChange = pp?.prePostChangePercent ?? null;
  const sessionLabel: Record<PrePostData["session"], string> = {
    pre: "ก่อน",
    post: "หลัง",
    regular: "ปกติ",
    closed: "ปิด",
  };

  // Portfolio stats
  const holdingValue = asset ? asset.quantity * asset.costPerShare : null;
  const currentValue =
    asset && priceForPct != null ? asset.quantity * priceForPct : null;
  const profitLoss =
    currentValue != null && holdingValue != null
      ? currentValue - holdingValue
      : null;
  const profitPct =
    profitLoss != null && holdingValue && holdingValue !== 0
      ? (profitLoss / holdingValue) * 100
      : null;

  const minPrice = chartHistory?.data?.length
    ? Math.min(...chartHistory.data.map((d) => d.price))
    : null;
  const maxPrice = chartHistory?.data?.length
    ? Math.max(...chartHistory.data.map((d) => d.price))
    : null;

  const rawChartData = chartHistory?.data ?? [];
  const chartData = (() => {
    if (displayedRange === "1h" && rawChartData.length > 0) {
      const lastTime = rawChartData[rawChartData.length - 1].time;
      const cutoff = lastTime - 24 * 60 * 60 * 1000;
      const filtered = rawChartData.filter((d) => d.time >= cutoff);
      return filtered.length > 0 ? filtered : rawChartData.slice(-24);
    }
    if (displayedRange === "1m" && rawChartData.length > 0) {
      const cutoff = Date.now() - 30 * 60 * 1000;
      const filtered = rawChartData.filter((d) => d.time >= cutoff);
      return filtered.length > 0 ? filtered : rawChartData.slice(-30);
    }
    return rawChartData;
  })();

  const chartPrevPrice = chartHistory?.previousClose ?? prevForPct;
  const haData = buildHeikinAshi(
    chartData,
    TARGET_CANDLES_BY_RANGE[displayedRange],
  );

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
        {/* Header */}
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
                {chartHistory?.shortName ?? getName(symbol)}
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

        {/* Scrollable Body */}
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
                {isThai ? fmt(displayPrice) : fmtUsd(displayPrice)}
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
                ≈ {toBaht(displayPrice, currencyRate)}
              </div>
            )}
          </div>

          {/* Chart + Chips */}
          <div className="py-3 border-b border-accent-yellow border-opacity-10">
            <div style={{ marginTop: 8 }}>
              {chartError ? (
                <div
                  style={{
                    height: 180,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,100,100,0.6)",
                    fontSize: 13,
                  }}
                >
                  {chartError}
                </div>
              ) : (
                <HAChart
                  data={haData}
                  rawData={chartData}
                  prevPrice={chartPrevPrice}
                  currentPrice={displayPrice}
                  range={displayedRange}
                  isLoading={isLoadingChart}
                />
              )}
            </div>
            <TimeframeChips
              value={range}
              onChange={setRange}
              isLoading={isLoadingChart}
            />
          </div>

          {/* Stats */}
          <div className="pb-5">
            <SectionLabel>ราคาวันนี้</SectionLabel>
            <StatRow
              label="ราคาปัจจุบัน"
              value={isThai ? fmt(displayPrice) : fmtUsd(displayPrice)}
              subValue={
                !isThai ? toBaht(displayPrice, currencyRate) : undefined
              }
            />
            <StatRow
              label="ราคาปิดก่อนหน้า"
              value={isThai ? fmt(prevForPct) : fmtUsd(prevForPct)}
              subValue={!isThai ? toBaht(prevForPct, currencyRate) : undefined}
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

            {asset && (
              <>
                <SectionLabel>พอร์ตฉัน</SectionLabel>
                <StatRow label="จำนวนหุ้น" value={`${asset.quantity} หุ้น`} />
                <StatRow
                  label="ต้นทุนเฉลี่ย"
                  value={
                    isThai
                      ? fmt(asset.costPerShare)
                      : fmtUsd(asset.costPerShare)
                  }
                  subValue={
                    !isThai
                      ? toBaht(asset.costPerShare, currencyRate)
                      : undefined
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
              </>
            )}

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
