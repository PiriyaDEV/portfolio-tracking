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

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

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

const INTRADAY_RANGES = new Set<TimeRange>(["1m", "5m", "15m", "1h", "4h"]);

const EMA_CONFIGS = [
  { length: 30, color: "rgba(30,130,220,0.90)", label: "EMA 30" },
  { length: 50, color: "rgba(255,140,40,0.90)", label: "EMA 50" },
  { length: 100, color: "rgba(180,100,255,0.90)", label: "EMA 100" },
  { length: 200, color: "rgba(255,210,40,0.90)", label: "EMA 200" },
] as const;

const MAIN_CHART_HEIGHT = 240;
const RSI_CHART_HEIGHT = 100;
const MIN_CHART_DIM = 32;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

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

function toChartTime(ms: number): Time {
  return Math.floor(ms / 1000) as unknown as Time;
}

function sortTime(a: Time, b: Time): number {
  const av = a as unknown as string | number;
  const bv = b as unknown as string | number;
  return av < bv ? -1 : av > bv ? 1 : 0;
}

/* ─────────────────────────────────────────────
   LWChart
   Destroyed & recreated on every range change
   via `key={range}` in the parent.
───────────────────────────────────────────── */

interface LWChartProps {
  rawData: ChartHistoryPoint[];
  prevPrice: number | null;
  range: TimeRange;
  isLoading: boolean;
}

function LWChart({ rawData, prevPrice, range, isLoading }: LWChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [emaValues, setEmaValues] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
  ]);
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
  const totalBarsRef = useRef(0);
  const isSyncingRef = useRef(false);

  /* ── 1. ResizeObserver gate ───────────────────────────────────────────── */
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const check = (rect: DOMRectReadOnly | DOMRect) => {
      if (rect.width >= MIN_CHART_DIM && rect.height >= MIN_CHART_DIM)
        setIsReady(true);
    };

    check(el.getBoundingClientRect());
    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) if (e.target === el) check(e.contentRect);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── 2. Create charts once wrapper is measured ────────────────────────── */
  useEffect(() => {
    if (!isReady || !mainContainerRef.current || !rsiContainerRef.current)
      return;
    if (mainChartRef.current) return; // StrictMode guard

    const intraday = INTRADAY_RANGES.has(range);

    const baseOpts = (height: number) => ({
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
        fixRightEdge: false, // clamped manually in subscribe
        rightBarStaysOnScroll: true,
        timeVisible: intraday,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
      },
      handleScale: { mouseWheel: true, pinch: true },
    });

    /* Main chart */
    const mainChart = createChart(mainContainerRef.current, {
      ...baseOpts(MAIN_CHART_HEIGHT),
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.06, bottom: 0.24 },
        textColor: "rgba(255,255,255,0.3)",
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
    mainChart
      .priceScale("vol")
      .applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });

    const emaSeriesList = EMA_CONFIGS.map((cfg) =>
      mainChart.addSeries(LineSeries, {
        color: cfg.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    );

    /* RSI chart */
    const rsiChart = createChart(rsiContainerRef.current, {
      ...baseOpts(RSI_CHART_HEIGHT),
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        textColor: "rgba(255,255,255,0.3)",
      },
      timeScale: { ...baseOpts(RSI_CHART_HEIGHT).timeScale, visible: false },
    });

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: "#1e7fcb",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
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

    /* Save to refs */
    mainChartRef.current = mainChart;
    rsiChartRef.current = rsiChart;
    candleRef.current = candle;
    volRef.current = vol;
    emaRefs.current = emaSeriesList;
    rsiRef.current = rsiSeries;
    rsiObRef.current = rsiOb;
    rsiOsRef.current = rsiOs;

    /* Sync + right-edge clamp */
    const clampRight = (r: { from: number; to: number }) => {
      const max = totalBarsRef.current - 1;
      if (r.to <= max) return r;
      const w = r.to - r.from;
      return { from: max - w, to: max };
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (isSyncingRef.current || !r) return;
      isSyncingRef.current = true;
      const c = clampRight(r);
      if (c !== r) mainChart.timeScale().setVisibleLogicalRange(c);
      rsiChart.timeScale().setVisibleLogicalRange(c);
      isSyncingRef.current = false;
    });
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (isSyncingRef.current || !r) return;
      isSyncingRef.current = true;
      const c = clampRight(r);
      if (c !== r) rsiChart.timeScale().setVisibleLogicalRange(c);
      mainChart.timeScale().setVisibleLogicalRange(c);
      isSyncingRef.current = false;
    });

    return () => {
      mainChart.remove();
      rsiChart.remove();
      mainChartRef.current =
        rsiChartRef.current =
        candleRef.current =
        volRef.current =
        rsiRef.current =
        rsiObRef.current =
        rsiOsRef.current =
          null;
      emaRefs.current = [null, null, null, null];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  /* ── 3. Feed data ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isReady || !candleRef.current || !volRef.current || !rawData.length)
      return;

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
      const key = Math.floor(d.time / 1000);
      const t = toChartTime(d.time);
      candleMap.set(key, {
        time: t,
        open: d.open ?? d.price,
        high: d.high ?? d.price,
        low: d.low ?? d.price,
        close: d.price,
      });
      volMap.set(key, {
        time: t,
        value: d.volume ?? 0,
        color:
          d.price >= (d.open ?? d.price)
            ? "rgba(74,222,128,0.28)"
            : "rgba(248,113,113,0.22)",
      });
    }

    const candles = Array.from(candleMap.values()).sort((a, b) =>
      sortTime(a.time, b.time),
    );
    const volBars = Array.from(volMap.values()).sort((a, b) =>
      sortTime(a.time, b.time),
    );

    candleRef.current.setData(candles);
    volRef.current.setData(volBars);

    // Sequential int times for indicator library
    const indicatorBars = candles.map((c, i) => ({
      time: i,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: 0,
    }));

    // Zip indicator plot values with candle times by index.
    // We ignore the time field from the indicator entirely and use candle[i].time.
    // plot0 length === indicatorBars.length, nulls appear at the start (warmup period).
    const zipWithCandleTime = (plots: { time: unknown; value: unknown }[]) => {
      const offset = candles.length - plots.length; // how many leading candles have no indicator value
      return plots
        .map((p, i) => ({
          time: candles[offset + i]?.time,
          value: p.value as number,
        }))
        .filter((p) => p.time != null && p.value != null && !isNaN(p.value));
    };

    /* EMA */
    const newEmaValues: (number | null)[] = [null, null, null, null];
    EMA_CONFIGS.forEach((cfg, idx) => {
      const series = emaRefs.current[idx];
      if (!series || indicatorBars.length < cfg.length) return;
      try {
        const raw =
          EMA.calculate(indicatorBars, { length: cfg.length, src: "close" })
            ?.plots?.plot0 ?? [];
        const mapped = zipWithCandleTime(raw);
        series.setData(mapped);
        const last = mapped[mapped.length - 1];
        if (last?.value != null) newEmaValues[idx] = last.value;
      } catch (e) {
        console.warn(`EMA ${cfg.length}`, e);
      }
    });
    setEmaValues(newEmaValues);

    /* RSI */
    if (
      rsiRef.current &&
      rsiObRef.current &&
      rsiOsRef.current &&
      indicatorBars.length >= 14
    ) {
      try {
        const raw =
          RSI.calculate(indicatorBars, { length: 14, src: "close" })?.plots
            ?.plot0 ?? [];
        const mappedRsi = zipWithCandleTime(raw);
        rsiRef.current.setData(mappedRsi);
        rsiObRef.current.setData(
          mappedRsi.map((p) => ({ time: p.time, value: 70 })),
        );
        rsiOsRef.current.setData(
          mappedRsi.map((p) => ({ time: p.time, value: 30 })),
        );
        const last = mappedRsi[mappedRsi.length - 1];
        setRsiValue(last?.value ?? null);
      } catch (e) {
        console.warn("RSI", e);
      }
    }

    /* Scroll to rightmost candle */
    const vc = VISIBLE_CANDLES[range];
    const total = candles.length;
    totalBarsRef.current = total;

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!mainChartRef.current) return;
        const r = { from: Math.max(0, total - vc), to: total - 1 };
        mainChartRef.current.timeScale().setVisibleLogicalRange(r);
        rsiChartRef.current?.timeScale().setVisibleLogicalRange(r);
      }),
    );
  }, [isReady, rawData, range, prevPrice]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  const totalHeight = MAIN_CHART_HEIGHT + RSI_CHART_HEIGHT + 28;
  const showChart = isReady && !isLoading && rawData.length > 0;

  return (
    <div
      ref={wrapperRef}
      data-chart-ready={isReady ? "true" : "false"}
      style={{ width: "100%", minHeight: totalHeight }}
    >
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
          <style>{`@keyframes lwspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {isReady && !isLoading && rawData.length === 0 && (
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

      <div style={{ display: showChart ? "block" : "none" }}>
        {/* EMA Legend */}
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
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                {cfg.label}:
              </span>
              <span style={{ color: cfg.color, fontWeight: 700 }}>
                {emaValues[idx] != null ? fmt(emaValues[idx]) : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Main candle chart */}
        <div
          ref={mainContainerRef}
          style={{
            width: "100%",
            height: MAIN_CHART_HEIGHT,
            overflow: "hidden",
            borderRadius: "8px 8px 0 0",
          }}
        />

        {/* RSI label */}
        <div
          style={{
            padding: "3px 8px",
            background: "rgba(30,127,203,0.06)",
            borderLeft: "2px solid rgba(30,127,203,0.5)",
            fontSize: 9,
            fontFamily: "monospace",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              color: "rgba(30,127,203,0.8)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            RSI(14)
          </span>
          <span style={{ color: "#1e7fcb", fontWeight: 700, fontSize: 10 }}>
            {rsiValue != null ? rsiValue.toFixed(2) : "—"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
            OB 70 · OS 30
          </span>
        </div>

        {/* RSI chart */}
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

/* ─────────────────────────────────────────────
   TimeframeChips
───────────────────────────────────────────── */

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
      <div style={{ display: "flex", gap: 6 }}>
        {TIMEFRAMES.map((tf) => {
          const active = tf.value === value;
          return (
            <button
              key={tf.value}
              onClick={() => onChange(tf.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "4px 0",
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

/* ─────────────────────────────────────────────
   StatRow / SectionLabel
───────────────────────────────────────────── */

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
  const isPos = signed && value.startsWith("+");
  const isNeg = signed && value.startsWith("-");
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
          className={isPos ? "!text-green-500" : isNeg ? "!text-red-500" : ""}
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

/* ─────────────────────────────────────────────
   StockDetailModal
───────────────────────────────────────────── */

export function StockDetailModal({
  asset,
  onClose,
  currencyRate,
  symbol,
  storeCurrentPrice,
  storePreviousPrice,
}: StockDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState<TimeRange>("1m");
  const [chartHistory, setChartHistory] = useState<ChartHistoryResponse | null>(
    null,
  );
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<PrePostData | null>(null);

  const isMarketOpen = useMarketStore((s) => s.marketStatus?.isOpen ?? true);
  const isPageVisible = usePageVisible();

  /* ── Modal open/close ─────────────────────────────────────────────────── */
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) handleClose();
  };

  /* ── Market data (pre/post price) ─────────────────────────────────────── */
  const fetchMarketData = useCallback(async () => {
    const res = await fetch(
      `/api/prepost?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" },
    );
    if (res.ok) setMarketData(await res.json());
  }, [symbol]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    if (!isPageVisible || !isMarketOpen) return;
    const id = setInterval(fetchMarketData, AUTO_REFRESH_1M_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchMarketData, isPageVisible, isMarketOpen]);

  /* ── Chart history ────────────────────────────────────────────────────── */
  const fetchChartHistory = useCallback(
    async (r: TimeRange) => {
      setIsLoadingChart(true);
      setChartError(null);
      setChartHistory(null); // clear stale data immediately so old range data never feeds new chart
      try {
        const res = await fetch(
          `/api/chart-history?symbol=${encodeURIComponent(symbol)}&range=${r}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setChartHistory(await res.json());
      } catch (err) {
        console.error("chart-history", err);
        setChartError("โหลดข้อมูลไม่ได้");
      } finally {
        setIsLoadingChart(false);
      }
    },
    [symbol],
  );

  useEffect(() => {
    fetchChartHistory(range);
  }, [range, fetchChartHistory]);

  useEffect(() => {
    if (!INTRADAY_RANGES.has(range) || !isPageVisible || !isMarketOpen) return;
    const id = setInterval(
      () => fetchChartHistory(range),
      AUTO_REFRESH_1M_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [range, fetchChartHistory, isPageVisible, isMarketOpen]);

  /* ── Derived values ───────────────────────────────────────────────────── */
  const pp = marketData;
  const isThai = isThaiStock(symbol);

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
  const chartPrevPrice = chartHistory?.previousClose ?? prevForPct;
  const minPrice = rawChartData.length
    ? Math.min(...rawChartData.map((d) => d.price))
    : null;
  const maxPrice = rawChartData.length
    ? Math.max(...rawChartData.map((d) => d.price))
    : null;

  /* ── Render ──────────────────────────────────────────────────────────── */
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
          transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
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

        {/* Body */}
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

          {/* Chart — key={range} forces full remount on timeframe change */}
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
                  key={`${range}-${isLoadingChart}`}
                  rawData={rawChartData}
                  prevPrice={chartPrevPrice}
                  range={range}
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
