"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
  LineStyle,
  Time,
} from "lightweight-charts";
import { RSI, EMA } from "lightweight-charts-indicators";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName, isThaiStock } from "@/app/lib/utils";
import { TimeRange } from "@/app/api/chart-history/route";
import { AUTO_REFRESH_1M_INTERVAL_MS } from "@/app/config";
import { usePageVisible } from "@/shared/hooks/usePageVisible";
import { useMarketStore } from "@/store/useMarketStore";

/* =======================
   Types
======================= */

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
  time: number; // ms
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

type StockDetailModalProps = {
  symbol: string;
  asset?: Asset | null;
  onClose: () => void;
  currencyRate: number;
  storeCurrentPrice?: number | null;
  storePreviousPrice?: number | null;
};

const TIMEFRAMES: { label: string; value: TimeRange }[] = [
  { label: "1 นาที", value: "1m" },
  { label: "ชั่วโมง", value: "1h" },
  { label: "วัน", value: "1d" },
  { label: "สัปดาห์", value: "1wk" },
  { label: "เดือน", value: "1mo" },
];

const VISIBLE_CANDLES: Record<TimeRange, number> = {
  "1m": 60,
  "5m": 60,
  "15m": 60,
  "1h": 48,
  "4h": 60,
  "1d": 60,
  "1wk": 52,
  "1mo": 24,
};

/* =======================
   Helpers
======================= */

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return fNumber(v) ?? "—";
}
function fmtUsd(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${fNumber(v) ?? "—"} USD`;
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

/* =======================
   EMA config
======================= */

const EMA_CONFIGS = [
  { length: 30, color: "rgba(30,130,220,0.90)", label: "EMA 30" },
  { length: 50, color: "rgba(255,140,40,0.90)", label: "EMA 50" },
  { length: 100, color: "rgba(180,100,255,0.90)", label: "EMA 100" },
  { length: 200, color: "rgba(255,210,40,0.90)", label: "EMA 200" },
] as const;

/* =======================
   LWChart
======================= */

const MAIN_CHART_HEIGHT = 240;
const RSI_CHART_HEIGHT = 100;
const MIN_CHART_DIMENSION = 32;

interface LWChartProps {
  rawData: ChartHistoryPoint[];
  prevPrice: number | null;
  range: TimeRange;
  isLoading: boolean;
  isUp: boolean;
}

function LWChart({ rawData, prevPrice, range, isLoading, isUp }: LWChartProps) {
  // Wrapper ref — we watch THIS for size before creating charts
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  // "ready" = wrapper has a usable pixel size (≥ MIN_CHART_DIMENSION)
  const [isReady, setIsReady] = useState(false);
  // Latest EMA values shown in the legend
  const [emaValues, setEmaValues] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  // Latest RSI value shown in the divider label
  const [rsiValue, setRsiValue] = useState<number | null>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleRef = useRef<ISeriesApi<"Candlestick", any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volRef = useRef<ISeriesApi<"Histogram", any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emaRefs = useRef<Array<ISeriesApi<"Line", any> | null>>([
    null,
    null,
    null,
    null,
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiRef = useRef<ISeriesApi<"Line", any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiObRef = useRef<ISeriesApi<"Line", any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiOsRef = useRef<ISeriesApi<"Line", any> | null>(null);
  const isSyncingRef = useRef(false);

  // ── Step 1: Wait for the wrapper to have real pixel dimensions ──────────
  // Uses ResizeObserver (same pattern as ChartContainer in chart.tsx) so we
  // never call createChart while width/height are still -1 or 0.
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const check = (rect: DOMRectReadOnly | DOMRect) => {
      if (
        rect.width >= MIN_CHART_DIMENSION &&
        rect.height >= MIN_CHART_DIMENSION
      ) {
        setIsReady(true);
      }
    };

    // Immediate check — may already be laid out (e.g. modal opened with animation)
    check(el.getBoundingClientRect());

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === el) check(entry.contentRect);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buildCommonOptions = (height: number) => ({
    autoSize: true,
    height,
    layout: {
      background: { color: "transparent" },
      textColor: "rgba(255,255,255,0.35)",
      fontFamily: "monospace",
      fontSize: 10,
    },
    grid: {
      vertLines: { color: "rgba(255,255,255,0.04)" },
      horzLines: { color: "rgba(255,255,255,0.04)" },
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      vertLine: {
        color: "rgba(255,255,255,0.25)",
        width: 1 as const,
        style: LineStyle.Dashed,
        labelBackgroundColor: "#1a1a1a",
      },
      horzLine: {
        color: "rgba(255,255,255,0.2)",
        width: 1 as const,
        style: LineStyle.Dashed,
        labelBackgroundColor: "#1a1a1a",
      },
    },
    timeScale: {
      borderVisible: false,
      fixLeftEdge: false,
      fixRightEdge: true,
      rightBarStaysOnScroll: true,
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
    },
    handleScale: { mouseWheel: true, pinch: true },
  });

  // ── Step 2: Create charts only AFTER wrapper is ready ───────────────────
  useEffect(() => {
    if (!isReady) return;
    if (!mainContainerRef.current || !rsiContainerRef.current) return;
    // Bail out if charts already created (StrictMode double-invoke guard)
    if (mainChartRef.current) return;

    // ── Main chart ──────────────────────────────────────────────────────
    const mainChart = createChart(mainContainerRef.current, {
      ...buildCommonOptions(MAIN_CHART_HEIGHT),
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.06, bottom: 0.24 },
        textColor: "rgba(255,255,255,0.3)",
      },
      timeScale: {
        ...buildCommonOptions(MAIN_CHART_HEIGHT).timeScale,
        timeVisible: false,
        secondsVisible: false,
      },
    });

    const candle = mainChart.addSeries(CandlestickSeries, {
      upColor: "#4ade80",
      downColor: "#f87171",
      borderUpColor: "#4ade80",
      borderDownColor: "#f87171",
      wickUpColor: "rgba(74,222,128,0.65)",
      wickDownColor: "rgba(248,113,113,0.65)",
    });

    const vol = mainChart.addSeries(HistogramSeries, {
      color: "rgba(100,100,100,0.3)",
      priceFormat: { type: "volume" as const },
      priceScaleId: "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    mainChart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false,
    });

    // EMA series (3 lines on main chart)
    const emaSeriesList = EMA_CONFIGS.map((cfg) =>
      mainChart.addSeries(LineSeries, {
        color: cfg.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    );

    // ── RSI chart ───────────────────────────────────────────────────────
    const rsiChart = createChart(rsiContainerRef.current, {
      ...buildCommonOptions(RSI_CHART_HEIGHT),
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        textColor: "rgba(255,255,255,0.3)",
      },
      timeScale: {
        ...buildCommonOptions(RSI_CHART_HEIGHT).timeScale,
        timeVisible: false,
        secondsVisible: false,
        visible: false,
      },
    });

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: "#1e7fcb",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });

    const rsiOb = rsiChart.addSeries(LineSeries, {
      color: "rgba(248,113,113,0.4)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const rsiOs = rsiChart.addSeries(LineSeries, {
      color: "rgba(74,222,128,0.4)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // Save to refs
    mainChartRef.current = mainChart;
    rsiChartRef.current = rsiChart;
    candleRef.current = candle;
    volRef.current = vol;
    emaRefs.current = emaSeriesList;
    rsiRef.current = rsiSeries;
    rsiObRef.current = rsiOb;
    rsiOsRef.current = rsiOs;

    // ── Sync scrolling between main ↔ RSI ──────────────────────────────
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (isSyncingRef.current || !r) return;
      isSyncingRef.current = true;
      rsiChart.timeScale().setVisibleLogicalRange(r);
      isSyncingRef.current = false;
    });
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (isSyncingRef.current || !r) return;
      isSyncingRef.current = true;
      mainChart.timeScale().setVisibleLogicalRange(r);
      isSyncingRef.current = false;
    });

    return () => {
      mainChart.remove();
      rsiChart.remove();
      mainChartRef.current = null;
      rsiChartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
      emaRefs.current = [null, null, null, null];
      rsiRef.current = null;
      rsiObRef.current = null;
      rsiOsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // ── Sync timeScale time-visibility when range changes ────────────────────
  useEffect(() => {
    if (!mainChartRef.current) return;
    const timeVisible = ["1m", "5m", "15m", "1h", "4h"].includes(range);
    mainChartRef.current.applyOptions({
      timeScale: { timeVisible, secondsVisible: false },
    });
  }, [range]);

  // ── Feed data whenever rawData / range / prevPrice change ────────────────
  useEffect(() => {
    if (!isReady) return;
    if (!candleRef.current || !volRef.current || !rawData.length) return;

    // Build deduped + sorted candle/volume data
    const candleMap = new Map<
      number,
      { time: Time; open: number; high: number; low: number; close: number }
    >();
    const volMap = new Map<
      number,
      { time: Time; value: number; color: string }
    >();

    for (const d of rawData) {
      if (d.price == null || isNaN(d.price)) continue;
      const tSec = Math.floor(d.time / 1000);
      const t = tSec as unknown as Time;

      candleMap.set(tSec, {
        time: t,
        open: d.open ?? d.price,
        high: d.high ?? d.price,
        low: d.low ?? d.price,
        close: d.price,
      });

      const upBar = d.price >= (d.open ?? d.price);
      volMap.set(tSec, {
        time: t,
        value: d.volume ?? 0,
        color: upBar ? "rgba(74,222,128,0.28)" : "rgba(248,113,113,0.22)",
      });
    }

    const candles = Array.from(candleMap.values()).sort(
      (a, b) => (a.time as unknown as number) - (b.time as unknown as number),
    );
    const volBars = Array.from(volMap.values()).sort(
      (a, b) => (a.time as unknown as number) - (b.time as unknown as number),
    );

    candleRef.current.setData(candles);
    volRef.current.setData(volBars);

    // Indicator bar array (time in unix seconds, same as candles)
    const indicatorBars = candles.map((c) => ({
      time: c.time as unknown as number,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: 0,
    }));

    // ── EMA overlays ────────────────────────────────────────────────────
    const newEmaValues: (number | null)[] = [null, null, null, null];
    EMA_CONFIGS.forEach((cfg, idx) => {
      const series = emaRefs.current[idx];
      if (!series || indicatorBars.length < cfg.length) return;
      try {
        const result = EMA.calculate(indicatorBars, {
          length: cfg.length,
          src: "close",
        });
        const plotData = result?.plots?.plot0;
        if (plotData?.length) {
          const valid = plotData.filter(
            (p: { time: unknown; value: unknown }) =>
              p.value != null && !isNaN(p.value as number),
          );
          series.setData(valid);
          // Grab the last value for the legend
          const last = valid[valid.length - 1];
          if (last?.value != null) newEmaValues[idx] = last.value as number;
        }
      } catch (e) {
        console.warn(`EMA ${cfg.length} calc error`, e);
      }
    });
    setEmaValues(newEmaValues);

    // ── RSI ─────────────────────────────────────────────────────────────
    if (
      rsiRef.current &&
      rsiObRef.current &&
      rsiOsRef.current &&
      indicatorBars.length >= 14
    ) {
      try {
        const rsiResult = RSI.calculate(indicatorBars, {
          length: 14,
          src: "close",
        });
        const rsiPlot = rsiResult?.plots?.plot0;
        if (rsiPlot?.length) {
          const validRsi = rsiPlot.filter(
            (p: { time: unknown; value: unknown }) =>
              p.value != null && !isNaN(p.value as number),
          );
          rsiRef.current.setData(validRsi);

          // Capture last RSI value for divider label
          const lastRsi = validRsi[validRsi.length - 1];
          setRsiValue(
            lastRsi?.value != null ? (lastRsi.value as number) : null,
          );

          rsiObRef.current.setData(
            validRsi.map((p: { time: unknown }) => ({
              time: p.time,
              value: 70,
            })),
          );
          rsiOsRef.current.setData(
            validRsi.map((p: { time: unknown }) => ({
              time: p.time,
              value: 30,
            })),
          );
        }
      } catch (e) {
        console.warn("RSI calc error", e);
      }
    }

    // ── Force rightmost position after chart has painted ─────────────────
    // rAF ensures lightweight-charts has completed its first layout pass
    // before we touch the timeScale — this is what prevents the off-by-a-few
    // bars issue when range changes or the chart first loads.
    const vc = VISIBLE_CANDLES[range];
    const totalBars = candles.length;

    const scrollToEnd = () => {
      if (!mainChartRef.current) return;
      mainChartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalBars - vc),
        to: totalBars - 1,
      });
      rsiChartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalBars - vc),
        to: totalBars - 1,
      });
    };

    // Double rAF: first frame = DOM commit, second frame = paint complete
    requestAnimationFrame(() => requestAnimationFrame(scrollToEnd));
  }, [isReady, rawData, range, prevPrice]);

  // ── Render ───────────────────────────────────────────────────────────────
  const totalHeight = MAIN_CHART_HEIGHT + RSI_CHART_HEIGHT + 28; // 28 = divider

  return (
    // wrapperRef is watched by ResizeObserver — stays visible always so
    // the observer can measure it, but chart DOM is only added once isReady.
    <div
      ref={wrapperRef}
      data-chart-ready={isReady ? "true" : "false"}
      style={{ width: "100%", minHeight: totalHeight }}
    >
      {/* Loading spinner — shown while data is fetching OR charts not ready */}
      {(isLoading || !isReady) && (
        <div
          style={{
            height: totalHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "2px solid rgba(255,198,0,0.15)",
              borderTopColor: "rgba(255,198,0,0.7)",
              animation: "lwspin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes lwspin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {isReady && !isLoading && !rawData.length && (
        <div
          style={{
            height: totalHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.2)",
            fontSize: 13,
          }}
        >
          ไม่มีข้อมูล
        </div>
      )}

      {/* Chart UI — rendered (and thus measurable) even before isReady,
          but createChart is only called once isReady flips true */}
      <div
        style={{
          display: isReady && !isLoading && rawData.length ? "block" : "none",
        }}
      >
        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "0 2px 6px",
            flexWrap: "wrap",
          }}
        >
          {EMA_CONFIGS.map((cfg, idx) => (
            <div
              key={cfg.length}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontFamily: "monospace",
                color: cfg.color,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 2,
                  borderRadius: 1,
                  background: cfg.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{ color: "rgba(255,255,255,0.45)", fontWeight: 400 }}
              >
                {cfg.label}:
              </span>
              <span style={{ color: cfg.color, fontWeight: 700 }}>
                {emaValues[idx] != null ? fmt(emaValues[idx]) : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Main candlestick */}
        <div
          ref={mainContainerRef}
          style={{
            width: "100%",
            height: MAIN_CHART_HEIGHT,
            overflow: "hidden",
            borderRadius: "8px 8px 0 0",
          }}
        />

        {/* RSI divider label */}
        <div
          style={{
            padding: "3px 8px",
            background: "rgba(30,127,203,0.06)",
            borderLeft: "2px solid rgba(30,127,203,0.5)",
            fontSize: 9,
            fontFamily: "monospace",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "rgba(30,127,203,0.8)" }}>RSI(14)</span>
          <span
            style={{
              color: "#1e7fcb",
              fontWeight: 700,
              fontSize: 10,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {rsiValue != null ? rsiValue.toFixed(2) : "—"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
            OB 70 · OS 30
          </span>
        </div>

        {/* RSI pane */}
        <div
          ref={rsiContainerRef}
          style={{
            width: "100%",
            height: RSI_CHART_HEIGHT,
            overflow: "hidden",
            borderRadius: "0 0 8px 8px",
          }}
        />
      </div>
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
    setMarketData(await res.json());
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
    const isIntraday = ["1m", "5m", "15m", "1h", "4h"].includes(range);
    if (!isIntraday || !isPageVisible || !isMarketOpen) return;
    const id = setInterval(
      () => fetchChartHistory(range),
      AUTO_REFRESH_1M_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [range, fetchChartHistory, isPageVisible, isMarketOpen]);

  useEffect(() => {
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

  const displayPrice =
    pp?.regularMarketPrice ?? storeCurrentPrice ?? pp?.currentPrice ?? null;
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

  const hasPrePost = pp && pp.session !== "regular" && pp.session !== "closed";
  const ppChange = pp?.prePostChangePercent ?? null;
  const sessionLabel: Record<PrePostData["session"], string> = {
    pre: "ก่อน",
    post: "หลัง",
    regular: "ปกติ",
    closed: "ปิด",
  };

  const holdingValue = asset ? asset.quantity * asset.costPerShare : null;
  const currentValue =
    asset && priceForPct != null ? asset.quantity * priceForPct : null;
  const profitLoss =
    currentValue != null && holdingValue != null
      ? currentValue - holdingValue
      : null;
  const profitPct =
    profitLoss != null && holdingValue
      ? (profitLoss / holdingValue) * 100
      : null;

  const rawChartData = chartHistory?.data ?? [];
  const chartData = rawChartData;

  const minPrice = chartData.length
    ? Math.min(...chartData.map((d) => d.price))
    : null;
  const maxPrice = chartData.length
    ? Math.max(...chartData.map((d) => d.price))
    : null;
  const chartPrevPrice = chartHistory?.previousClose ?? prevForPct;

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
                    height: MAIN_CHART_HEIGHT + RSI_CHART_HEIGHT + 28,
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
                <LWChart
                  rawData={chartData}
                  prevPrice={chartPrevPrice}
                  range={displayedRange}
                  isLoading={isLoadingChart}
                  isUp={isUp}
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
