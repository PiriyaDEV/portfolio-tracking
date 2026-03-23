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
import NumberFlow from "@number-flow/react";
import { Asset } from "@/app/lib/interface";
import { fNumber, getLogo, getName, isThaiStock } from "@/app/lib/utils";
import { TimeRange } from "@/app/api/chart-history/route";
import {
  AUTO_REFRESH_1M_INTERVAL_MS,
  AUTO_REFRESH_GRAPH_INTERVAL_MS,
} from "@/app/config";
import { usePageVisible } from "@/shared/hooks/usePageVisible";
import { useMarketStore } from "@/store/useMarketStore";
import { AdvancedLevels } from "@/app/api/stock/support.function";
import { numberFlowTiming } from "@/shared/components/common/AnimatedNumber";

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
  time: number;
  price: number;
  high: number;
  low: number;
  open: number;
  volume: number;
};

type DividendEvent = {
  date: number;
  amount: number;
};

type ChartHistoryResponse = {
  symbol: string;
  range: TimeRange;
  previousClose: number | null;
  shortName: string;
  currency: string;
  data: ChartHistoryPoint[];
  dividendRate: number | null;
  dividendYield: number | null;
  lastDividendAmount: number | null;
  lastDividendDate: number | null;
  dividendEvents: DividendEvent[];
};

type GraphModalProps = {
  symbol: string;
  asset?: Asset | null;
  onClose: () => void;
  currencyRate: number;
};

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

const TIMEFRAMES: { label: string; value: TimeRange }[] = [
  { label: "1 นาที", value: "1m" },
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

const MAIN_H = 240;
const RSI_H = 100;

/* ─────────────────────────────────────────────
   Pure helpers (no hooks)
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
  const bangkokOffset = 7 * 60 * 60 * 1000;
  return Math.floor((ms + bangkokOffset) / 1000) as unknown as Time;
}

function fmtDate(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildCandles(rawData: ChartHistoryPoint[]) {
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
    const up = d.price >= (d.open ?? d.price);
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
      color: up ? "rgba(74,222,128,0.28)" : "rgba(248,113,113,0.22)",
    });
  }

  const sort = (a: { time: Time }, b: { time: Time }) => {
    const av = a.time as unknown as number;
    const bv = b.time as unknown as number;
    return av < bv ? -1 : av > bv ? 1 : 0;
  };

  const candles = Array.from(candleMap.values()).sort(sort);
  const volBars = Array.from(volMap.values()).sort(sort);

  const bridgeCandles: typeof candles = [];
  const bridgeVolBars: typeof volBars = [];

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const gapUp = curr.low > prev.high;
    const gapDown = curr.high < prev.low;
    if (gapUp || gapDown) {
      const bridgeOpen = prev.close;
      const bridgeClose = curr.open;
      const prevTime = prev.time as unknown as number;
      const currTime = curr.time as unknown as number;
      const bridgeTime = Math.round(
        (prevTime + currTime) / 2,
      ) as unknown as Time;
      bridgeCandles.push({
        time: bridgeTime,
        open: bridgeOpen,
        close: bridgeClose,
        high: Math.max(bridgeOpen, bridgeClose),
        low: Math.min(bridgeOpen, bridgeClose),
      });
      bridgeVolBars.push({
        time: bridgeTime,
        value: 0,
        color:
          bridgeClose >= bridgeOpen
            ? "rgba(74,222,128,0.28)"
            : "rgba(248,113,113,0.22)",
      });
    }
  }

  const allCandles = [...candles, ...bridgeCandles].sort(sort);
  const allVolBars = [...volBars, ...bridgeVolBars].sort(sort);

  return { candles: allCandles, volBars: allVolBars };
}

function alignPlot(
  plots: { time: unknown; value: unknown }[],
  candles: { time: Time }[],
) {
  return plots
    .map((p, i) => ({ time: candles[i]?.time, value: p.value as number }))
    .filter(
      (p): p is { time: Time; value: number } =>
        p.time != null && p.value != null && !isNaN(p.value),
    );
}

/* ─────────────────────────────────────────────
   LWChart
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
  const isSyncRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const candlesSnapshotRef = useRef<
    { time: Time; open: number; high: number; low: number; close: number }[]
  >([]);
  const emaDataRef = useRef<number[][]>([[], [], [], []]);
  const rsiDataRef = useRef<number[]>([]);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const markReady = () => setIsReady(true);
    const check = (rect: DOMRectReadOnly | DOMRect) => {
      if (rect.width >= 32 && rect.height >= 32) markReady();
    };
    check(el.getBoundingClientRect());
    const fallback = setTimeout(markReady, 300);
    if (typeof ResizeObserver === "undefined")
      return () => clearTimeout(fallback);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) if (e.target === el) check(e.contentRect);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !mainContainerRef.current || !rsiContainerRef.current)
      return;
    if (mainChartRef.current) return;

    const intraday = INTRADAY_RANGES.has(range);

    const base = (height: number) => ({
      localization: {
        locale: "th-TH",
        timeFormatter: (time: number) => {
          const ms = time > 1e10 ? time : time * 1000;
          const date = new Date(ms);
          return date.toLocaleTimeString("th-TH", {
            timeZone: "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        },
        dateFormatter: (time: number) => {
          const ms = time > 1e10 ? time : time * 1000;
          const date = new Date(ms);
          return date.toLocaleDateString("th-TH", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        },
      },
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
      crosshair: { mode: CrosshairMode.Hidden },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightBarStaysOnScroll: true,
        timeVisible: intraday,
        secondsVisible: false,
        ignoreWhitespaceIndices: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      kineticScroll: { mouse: false, touch: true },
    });

    const mainChart = createChart(mainContainerRef.current, {
      ...base(MAIN_H),
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.06, bottom: 0.22 },
        textColor: "rgba(255,255,255,0.3)",
      },
    });

    const candle = mainChart.addSeries(CandlestickSeries, {
      upColor: "#4ade80",
      downColor: "#f87171",
      borderUpColor: "#4ade80",
      borderDownColor: "#f87171",
      wickUpColor: "rgba(74,222,128,0.6)",
      wickDownColor: "rgba(248,113,113,0.6)",
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

    const rsiChart = createChart(rsiContainerRef.current, {
      ...base(RSI_H),
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        textColor: "rgba(255,255,255,0.3)",
      },
      timeScale: { ...base(RSI_H).timeScale, visible: false },
    });

    const rsiLine = rsiChart.addSeries(LineSeries, {
      color: "#1e7fcb",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    const rsiOb = rsiChart.addSeries(LineSeries, {
      color: "rgba(248,113,113,0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const rsiOs = rsiChart.addSeries(LineSeries, {
      color: "rgba(74,222,128,0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    mainChartRef.current = mainChart;
    rsiChartRef.current = rsiChart;
    candleRef.current = candle;
    volRef.current = vol;
    emaRefs.current = emaSeriesList;
    rsiRef.current = rsiLine;
    rsiObRef.current = rsiOb;
    rsiOsRef.current = rsiOs;

    const clamp = (r: { from: number; to: number }) => {
      const max = totalBarsRef.current - 1;
      if (r.to <= max) return r;
      const w = r.to - r.from;
      return { from: max - w, to: max };
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (isSyncRef.current || !r) return;
      isSyncRef.current = true;
      const c = clamp(r);
      if (c !== r) mainChart.timeScale().setVisibleLogicalRange(c);
      rsiChart.timeScale().setVisibleLogicalRange(c);
      if (r && candlesSnapshotRef.current.length) {
        const lastVisible = Math.floor(r.to);
        const emaVals = emaDataRef.current.map(
          (arr) => arr[lastVisible] ?? null,
        );
        setEmaValues(emaVals);
        const rsi = rsiDataRef.current[lastVisible];
        setRsiValue(rsi ?? null);
      }
      isSyncRef.current = false;
    });
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (isSyncRef.current || !r) return;
      isSyncRef.current = true;
      const c = clamp(r);
      if (c !== r) rsiChart.timeScale().setVisibleLogicalRange(c);
      mainChart.timeScale().setVisibleLogicalRange(c);
      if (r && candlesSnapshotRef.current.length) {
        const lastVisible = Math.floor(r.to);
        const emaVals = emaDataRef.current.map(
          (arr) => arr[lastVisible] ?? null,
        );
        setEmaValues(emaVals);
        const rsi = rsiDataRef.current[lastVisible];
        setRsiValue(rsi ?? null);
      }
      isSyncRef.current = false;
    });

    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
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

  useEffect(() => {
    if (!isReady || !candleRef.current || !volRef.current || !rawData.length)
      return;

    const { candles, volBars } = buildCandles(rawData);

    candleRef.current.setData(candles);
    volRef.current.setData(volBars);
    candlesSnapshotRef.current = candles;

    const indBars = candles.map((c, i) => ({
      time: i,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: 0,
    }));

    const newEmaValues: (number | null)[] = [null, null, null, null];
    const newEmaData: number[][] = [[], [], [], []];
    EMA_CONFIGS.forEach((cfg, idx) => {
      const series = emaRefs.current[idx];
      if (!series || indBars.length < cfg.length) return;
      try {
        const mapped = alignPlot(
          EMA.calculate(indBars, { length: cfg.length, src: "close" })?.plots
            ?.plot0 ?? [],
          candles,
        );
        series.setData(mapped);
        const arr = new Array(candles.length).fill(null);
        mapped.forEach((p) => {
          const i = candles.findIndex((c) => c.time === p.time);
          if (i !== -1) arr[i] = p.value;
        });
        newEmaData[idx] = arr;
        const last = mapped[mapped.length - 1];
        if (last != null) newEmaValues[idx] = last.value;
      } catch (e) {
        console.warn(`EMA ${cfg.length}`, e);
      }
    });
    emaDataRef.current = newEmaData;
    setEmaValues(newEmaValues);

    if (
      rsiRef.current &&
      rsiObRef.current &&
      rsiOsRef.current &&
      indBars.length >= 14
    ) {
      try {
        const mappedRsi = alignPlot(
          RSI.calculate(indBars, { length: 14, src: "close" })?.plots?.plot0 ??
            [],
          candles,
        );
        const rsiArr = new Array(candles.length).fill(null);
        mappedRsi.forEach((p) => {
          const i = candles.findIndex((c) => c.time === p.time);
          if (i !== -1) rsiArr[i] = p.value;
        });
        rsiDataRef.current = rsiArr;
        rsiRef.current.setData(mappedRsi);
        rsiObRef.current.setData(
          candles.map((c) => ({ time: c.time as Time, value: 70 })),
        );
        rsiOsRef.current.setData(
          candles.map((c) => ({ time: c.time as Time, value: 30 })),
        );
        const last = mappedRsi[mappedRsi.length - 1];
        setRsiValue(last?.value ?? null);
      } catch (e) {
        console.warn("RSI", e);
      }
    }

    const vc = VISIBLE_CANDLES[range];
    const total = candles.length;
    totalBarsRef.current = total;

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (!mainChartRef.current) return;
      const r = { from: Math.max(0, total - vc), to: total - 1 };
      mainChartRef.current.timeScale().setVisibleLogicalRange(r);
      rsiChartRef.current?.timeScale().setVisibleLogicalRange(r);
    }, 100);
  }, [isReady, rawData, range, prevPrice]);

  const totalH = MAIN_H + RSI_H + 28;
  const showChart = isReady && !isLoading && rawData.length > 0;

  return (
    <div ref={wrapperRef} style={{ width: "100%", minHeight: totalH }}>
      {(isLoading || !isReady) && (
        <div
          style={{
            height: totalH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "2px solid rgba(255,198,0,0.12)",
              borderTopColor: "rgba(255,198,0,0.7)",
              animation: "lwspin 0.65s linear infinite",
            }}
          />
          <style>{`@keyframes lwspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {isReady && !isLoading && rawData.length === 0 && (
        <div
          style={{
            height: totalH,
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
                gap: 4,
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
              <span style={{ color: "rgba(255,255,255,0.38)" }}>
                {cfg.label}:
              </span>
              {/* ── Animated EMA value ── */}
              {emaValues[idx] != null ? (
                <NumberFlow
                  value={emaValues[idx]!}
                  format={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    useGrouping: true,
                  }}
                  style={{
                    color: cfg.color,
                    fontWeight: 700,
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  {...numberFlowTiming}
                />
              ) : (
                <span style={{ color: cfg.color, fontWeight: 700 }}>—</span>
              )}
            </div>
          ))}
        </div>

        <div
          ref={mainContainerRef}
          style={{
            width: "100%",
            height: MAIN_H,
            overflow: "hidden",
            borderRadius: "8px 8px 0 0",
          }}
        />

        <div
          style={{
            padding: "3px 8px",
            background: "rgba(30,127,203,0.06)",
            borderLeft: "2px solid rgba(30,127,203,0.45)",
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
          {/* ── Animated RSI value ── */}
          {rsiValue != null ? (
            <NumberFlow
              value={rsiValue}
              format={{
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }}
              style={{
                color: "#1e7fcb",
                fontWeight: 700,
                fontSize: 10,
                fontFamily: "monospace",
              }}
              {...numberFlowTiming}
            />
          ) : (
            <span style={{ color: "#1e7fcb", fontWeight: 700, fontSize: 10 }}>
              —
            </span>
          )}
          <span style={{ color: "rgba(255,255,255,0.18)", marginLeft: "auto" }}>
            OB 70 · OS 30
          </span>
        </div>

        <div
          ref={rsiContainerRef}
          style={{
            width: "100%",
            height: RSI_H,
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
          color: "rgba(255,198,0,0.55)",
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
              onClick={() => !isLoading && onChange(tf.value)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                fontFamily: "monospace",
                border: active
                  ? "1px solid rgba(255,198,0,0.55)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: active ? "rgba(255,198,0,0.12)" : "transparent",
                color: active
                  ? "rgba(255,198,0,0.95)"
                  : "rgba(255,255,255,0.4)",
                cursor: isLoading ? "default" : "pointer",
                transition: "all 0.12s",
                outline: "none",
                opacity: isLoading && !active ? 0.45 : 1,
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
  active,
  activeColor,
  animatedValue,
  animatedDecimals,
  animatedSuffix,
  animatedSubValue,
}: {
  label: string;
  value?: string;
  subValue?: string;
  signed?: boolean;
  active?: boolean;
  activeColor?: "emerald" | "red" | "orange";
  animatedValue?: number | null;
  animatedDecimals?: number;
  animatedSuffix?: string;
  animatedSubValue?: number | null;
}) {
  const displayValue = value ?? "—";
  const isPos = signed && displayValue.startsWith("+");
  const isNeg = signed && displayValue.startsWith("-");

  const colorMap = {
    emerald: {
      label: "rgba(52,211,153,0.9)",
      value: "rgba(52,211,153,1)",
      dot: "#34d399",
      dotGlow: "rgba(52,211,153,0.5)",
      rowBg: "rgba(52,211,153,0.04)",
      rowBorder: "rgba(52,211,153,0.12)",
    },
    red: {
      label: "rgba(248,113,113,0.9)",
      value: "rgba(248,113,113,1)",
      dot: "#f87171",
      dotGlow: "rgba(248,113,113,0.5)",
      rowBg: "rgba(248,113,113,0.04)",
      rowBorder: "rgba(248,113,113,0.12)",
    },
    orange: {
      label: "rgba(251,146,60,0.9)",
      value: "rgba(251,146,60,1)",
      dot: "#fb923c",
      dotGlow: "rgba(251,146,60,0.5)",
      rowBg: "rgba(251,146,60,0.04)",
      rowBorder: "rgba(251,146,60,0.12)",
    },
  };

  const c = active && activeColor ? colorMap[activeColor] : null;

  const valueColor = c
    ? c.value
    : signed
      ? undefined
      : "rgba(255,255,255,0.88)";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 10px",
        borderBottom: `1px solid ${c ? c.rowBorder : "rgba(255,198,0,0.05)"}`,
        borderRadius: active ? 8 : 0,
        background: c ? c.rowBg : "transparent",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {c && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: c.dot,
              boxShadow: `0 0 6px ${c.dotGlow}`,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontSize: 13,
            color: c ? c.label : "rgba(255,255,255,0.5)",
            fontWeight: active ? 600 : 400,
            transition: "color 0.2s",
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
        }}
      >
        {/* Use NumberFlow when animatedValue is provided, else fall back to string */}
        {animatedValue != null ? (
          <NumberFlow
            value={animatedValue}
            format={{
              minimumFractionDigits: animatedDecimals ?? 2,
              maximumFractionDigits: animatedDecimals ?? 2,
              signDisplay: signed ? "always" : "auto",
              useGrouping: true,
            }}
            suffix={animatedSuffix ?? ""}
            className={isPos ? "!text-green-500" : isNeg ? "!text-red-500" : ""}
            style={{
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              fontFamily: "monospace",
              color: valueColor,
              transition: "color 0.2s",
            }}
            {...numberFlowTiming}
          />
        ) : (
          <span
            className={isPos ? "!text-green-500" : isNeg ? "!text-red-500" : ""}
            style={{
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              fontFamily: "monospace",
              color: valueColor,
              transition: "color 0.2s",
            }}
          >
            {displayValue}
          </span>
        )}
        {subValue && (
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.25)",
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
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        margin: "18px 0 2px",
        fontFamily: "monospace",
      }}
      className="!text-yellow-500 opacity-55"
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GraphModal
───────────────────────────────────────────── */

export function GraphModal({
  asset,
  onClose,
  currencyRate,
  symbol,
}: GraphModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [levels, setLevels] = useState<AdvancedLevels | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "analysis">("info");

  const storeCurrentPrice = useMarketStore((s) => s.prices?.[symbol] ?? null);
  const storePreviousPrice = useMarketStore(
    (s) => s.previousPrice?.[symbol] ?? null,
  );

  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState<TimeRange>("1d");
  const [chartHistory, setChartHistory] = useState<ChartHistoryResponse | null>(
    null,
  );
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<PrePostData | null>(null);

  const isMarketOpen = useMarketStore((s) => s.marketStatus?.isOpen ?? true);
  const isPageVisible = usePageVisible();

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) handleClose();
  };

  useEffect(() => {
    fetch(`/api/advanced-levels?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setLevels)
      .catch(console.error);
  }, [symbol]);

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

  const fetchChartHistory = useCallback(
    async (r: TimeRange, silent = false) => {
      if (!silent) {
        setIsLoadingChart(true);
        setChartError(null);
        setChartHistory(null);
      }
      try {
        const res = await fetch(
          `/api/chart-history?symbol=${encodeURIComponent(symbol)}&range=${r}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setChartHistory(await res.json());
      } catch (err) {
        console.error("chart-history", err);
        if (!silent) setChartError("โหลดข้อมูลไม่ได้");
      } finally {
        if (!silent) setIsLoadingChart(false);
      }
    },
    [symbol],
  );

  useEffect(() => {
    fetchChartHistory(range);
  }, [range, fetchChartHistory]);

  useEffect(() => {
    if (range !== "1m" || !isPageVisible || !isMarketOpen) return;
    const id = setInterval(
      () => fetchChartHistory("1m", true),
      AUTO_REFRESH_GRAPH_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [range, fetchChartHistory, isPageVisible, isMarketOpen]);

  useEffect(() => {
    if (!INTRADAY_RANGES.has(range) || range === "1m") return;
    if (!isPageVisible || !isMarketOpen) return;
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
    storeCurrentPrice ?? pp?.regularMarketPrice ?? pp?.currentPrice ?? null;
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

  const dividendRate = chartHistory?.dividendRate ?? null;
  const dividendYield = chartHistory?.dividendYield ?? null;
  const lastDividendAmount = chartHistory?.lastDividendAmount ?? null;
  const lastDividendDate = chartHistory?.lastDividendDate ?? null;

  const annualDividendFromPortfolio =
    dividendRate != null && asset?.quantity != null
      ? dividendRate * asset.quantity
      : null;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 flex items-center justify-center !z-[100] py-4 px-3 backdrop-blur-sm"
      style={{
        background: "rgba(0,0,0,0.80)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.18s ease",
      }}
    >
      <div
        className="bg-black rounded-2xl w-full max-w-[440px] flex flex-col overflow-hidden border border-accent-yellow border-opacity-20 shadow-2xl"
        style={{
          maxHeight: "94vh",
          transform: visible ? "scale(1)" : "scale(0.96)",
          transition: "transform 0.18s cubic-bezier(0.34,1.4,0.64,1)",
          willChange: "transform",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-accent-yellow border-opacity-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-accent-yellow border-opacity-20 flex items-center justify-center shrink-0 bg-black">
              {getLogo(symbol) ? (
                <div
                  className="w-full h-full bg-cover bg-center bg-white"
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
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${ppChange >= 0 ? "!text-green-500" : "!text-red-500"}`}
                    style={{
                      background:
                        ppChange >= 0
                          ? "rgba(74,222,128,0.1)"
                          : "rgba(248,113,113,0.1)",
                      border: `1px solid ${ppChange >= 0 ? "rgba(74,222,128,0.22)" : "rgba(248,113,113,0.22)"}`,
                    }}
                  >
                    {sessionLabel[pp!.session]}
                    {/* ── Animated pre/post badge ── */}
                    <NumberFlow
                      value={ppChange}
                      format={{
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                        signDisplay: "always",
                      }}
                      suffix="%"
                      style={{
                        color: ppChange >= 0 ? "#4ade80" : "#f87171",
                        fontSize: "10px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                      {...numberFlowTiming}
                    />
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

        {/* Scrollable body */}
        <div
          className="overflow-y-auto flex-1 px-3"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Price */}
          <div className="py-4 border-b border-accent-yellow border-opacity-10">
            <div className="flex items-end gap-3 flex-wrap">
              {/* ── Animated main price ── */}
              {displayPrice != null ? (
                <NumberFlow
                  value={displayPrice}
                  format={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    useGrouping: true,
                  }}
                  suffix={isThai ? "" : " USD"}
                  className="text-white font-bold"
                  style={{
                    fontSize: 34,
                    fontFamily: "monospace",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                  {...numberFlowTiming}
                />
              ) : (
                <div
                  className="text-white font-bold"
                  style={{
                    fontSize: 34,
                    fontFamily: "monospace",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  —
                </div>
              )}
              {/* ── Animated price change badge ── */}
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full mb-0.5 font-mono flex items-center gap-1 ${isUp ? "!text-green-500" : "!text-red-500"}`}
                style={{
                  background: isUp
                    ? "rgba(74,222,128,0.1)"
                    : "rgba(248,113,113,0.1)",
                  border: `1px solid ${isUp ? "rgba(74,222,128,0.22)" : "rgba(248,113,113,0.22)"}`,
                }}
              >
                <NumberFlow
                  value={priceChange}
                  format={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    signDisplay: "always",
                    useGrouping: true,
                  }}
                  suffix={isThai ? "" : " USD"}
                  style={{
                    color: isUp ? "#4ade80" : "#f87171",
                    fontSize: "14px",
                    fontFamily: "monospace",
                  }}
                  {...numberFlowTiming}
                />
                <span style={{ color: isUp ? "#4ade80" : "#f87171" }}>(</span>
                <NumberFlow
                  value={percentChange}
                  format={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    signDisplay: "always",
                  }}
                  suffix="%"
                  style={{
                    color: isUp ? "#4ade80" : "#f87171",
                    fontSize: "14px",
                    fontFamily: "monospace",
                  }}
                  {...numberFlowTiming}
                />
                <span style={{ color: isUp ? "#4ade80" : "#f87171" }}>)</span>
              </span>
            </div>
            {!isThai && displayPrice != null && (
              <div
                className="mt-1 text-xs font-mono flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                ≈
                <NumberFlow
                  value={displayPrice * currencyRate}
                  format={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    useGrouping: true,
                  }}
                  suffix=" บาท"
                  style={{
                    color: "rgba(255,255,255,0.28)",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                  {...numberFlowTiming}
                />
              </div>
            )}
          </div>

          {/* Chart section */}
          <div className="py-3 border-b border-accent-yellow border-opacity-10">
            <div style={{ marginTop: 8 }}>
              {chartError ? (
                <div
                  style={{
                    height: MAIN_H + RSI_H + 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,100,100,0.55)",
                    fontSize: 13,
                  }}
                >
                  {chartError}
                </div>
              ) : (
                <LWChart
                  key={range}
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

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              margin: "12px 0 0",
            }}
          >
            {(["info", "analysis"] as const).map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    fontFamily: "monospace",
                    background: "transparent",
                    border: "none",
                    borderBottom: active
                      ? "2px solid rgba(255,198,0,0.85)"
                      : "2px solid transparent",
                    color: active
                      ? "rgba(255,198,0,0.95)"
                      : "rgba(255,255,255,0.35)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    outline: "none",
                    marginBottom: -1,
                    letterSpacing: "0.04em",
                  }}
                >
                  {tab === "info" ? "ข้อมูล" : "วิเคราะห์"}
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div className="pb-5">
            {activeTab === "info" && (
              <>
                <SectionLabel>ราคาวันนี้</SectionLabel>
                <StatRow
                  label="ราคาปัจจุบัน"
                  animatedValue={displayPrice}
                  animatedSuffix={isThai ? "" : " USD"}
                  subValue={
                    !isThai && displayPrice != null
                      ? toBaht(displayPrice, currencyRate)
                      : undefined
                  }
                />
                <StatRow
                  label="ราคาปิดก่อนหน้า"
                  animatedValue={prevForPct}
                  animatedSuffix={isThai ? "" : " USD"}
                  subValue={
                    !isThai && prevForPct != null
                      ? toBaht(prevForPct, currencyRate)
                      : undefined
                  }
                />
                <StatRow
                  label="เปลี่ยนแปลง"
                  animatedValue={priceChange}
                  animatedSuffix={isThai ? "" : " USD"}
                  signed
                  subValue={
                    !isThai && priceChange != null
                      ? (priceChange >= 0 ? "+" : "") +
                        toBaht(priceChange, currencyRate)
                      : undefined
                  }
                />
                <StatRow
                  label="% เปลี่ยนแปลง"
                  animatedValue={percentChange}
                  animatedSuffix="%"
                  signed
                />
                <StatRow
                  label="สูงสุดวันนี้"
                  animatedValue={maxPrice}
                  animatedSuffix={isThai ? "" : " USD"}
                  subValue={
                    !isThai && maxPrice != null
                      ? toBaht(maxPrice, currencyRate)
                      : undefined
                  }
                />
                <StatRow
                  label="ต่ำสุดวันนี้"
                  animatedValue={minPrice}
                  animatedSuffix={isThai ? "" : " USD"}
                  subValue={
                    !isThai && minPrice != null
                      ? toBaht(minPrice, currencyRate)
                      : undefined
                  }
                />

                <SectionLabel>ปันผล</SectionLabel>
                {dividendRate == null ? (
                  <>
                    <StatRow label="สถานะ" value="ไม่มีปันผล" />
                    <StatRow label="ปันผลต่อหุ้น / ปี" value="—" />
                    <StatRow label="Dividend Yield" value="—" />
                    <StatRow label="จ่ายล่าสุด" value="—" />
                    {asset && (
                      <StatRow label="รับปันผล / ปี (พอร์ต)" value="—" />
                    )}
                  </>
                ) : (
                  <>
                    <StatRow
                      label="ปันผลต่อหุ้น / ปี"
                      animatedValue={dividendRate}
                      animatedSuffix={isThai ? " บาท" : " USD"}
                      subValue={
                        !isThai ? toBaht(dividendRate, currencyRate) : undefined
                      }
                    />
                    <StatRow
                      label="Dividend Yield"
                      animatedValue={
                        dividendYield != null ? dividendYield * 100 : null
                      }
                      animatedSuffix="%"
                      animatedDecimals={2}
                    />
                    <StatRow
                      label="จ่ายล่าสุด"
                      animatedValue={lastDividendAmount}
                      animatedSuffix={isThai ? " บาท" : " USD"}
                      subValue={
                        lastDividendDate != null
                          ? fmtDate(lastDividendDate)
                          : undefined
                      }
                    />
                    {asset && (
                      <StatRow
                        label="รับปันผล / ปี (พอร์ต)"
                        animatedValue={annualDividendFromPortfolio}
                        animatedSuffix={isThai ? " บาท" : " USD"}
                        subValue={
                          !isThai && annualDividendFromPortfolio != null
                            ? toBaht(annualDividendFromPortfolio, currencyRate)
                            : undefined
                        }
                      />
                    )}
                  </>
                )}

                {asset && (
                  <>
                    <SectionLabel>พอร์ตฉัน</SectionLabel>
                    <StatRow
                      label="จำนวนหุ้น"
                      value={`${asset.quantity} หุ้น`}
                    />
                    <StatRow
                      label="ต้นทุนเฉลี่ย"
                      animatedValue={asset.costPerShare}
                      animatedSuffix={isThai ? "" : " USD"}
                      subValue={
                        !isThai
                          ? toBaht(asset.costPerShare, currencyRate)
                          : undefined
                      }
                    />
                    <StatRow
                      label="มูลค่าต้นทุน"
                      animatedValue={holdingValue}
                      animatedSuffix={isThai ? "" : " USD"}
                      subValue={
                        !isThai && holdingValue != null
                          ? toBaht(holdingValue, currencyRate)
                          : undefined
                      }
                    />
                    <StatRow
                      label="มูลค่าปัจจุบัน"
                      animatedValue={currentValue}
                      animatedSuffix={isThai ? "" : " USD"}
                      subValue={
                        !isThai && currentValue != null
                          ? toBaht(currentValue, currencyRate)
                          : undefined
                      }
                    />
                    <StatRow
                      label="กำไร / ขาดทุน"
                      animatedValue={profitLoss}
                      animatedSuffix={isThai ? "" : " USD"}
                      signed
                      subValue={
                        !isThai && profitLoss != null
                          ? `${profitLoss >= 0 ? "+" : ""}${toBaht(profitLoss, currencyRate)}`
                          : undefined
                      }
                    />
                    <StatRow
                      label="% กำไร / ขาดทุน"
                      animatedValue={profitPct}
                      animatedSuffix="%"
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
                          animatedValue={pp.currentPrice}
                          animatedSuffix={isThai ? "" : " USD"}
                          subValue={
                            !isThai && pp.currentPrice != null
                              ? toBaht(pp.currentPrice, currencyRate)
                              : undefined
                          }
                        />
                        <StatRow
                          label="% เปลี่ยนแปลง"
                          animatedValue={ppChange}
                          animatedSuffix="%"
                          signed
                        />
                      </>
                    )}
                    <StatRow
                      label="ราคาปิดตลาด"
                      animatedValue={pp.regularMarketPrice}
                      animatedSuffix={isThai ? "" : " USD"}
                      subValue={
                        !isThai && pp.regularMarketPrice != null
                          ? toBaht(pp.regularMarketPrice, currencyRate)
                          : undefined
                      }
                    />
                    <StatRow
                      label="ราคาปิดก่อนหน้า"
                      animatedValue={pp.previousClose}
                      animatedSuffix={isThai ? "" : " USD"}
                      subValue={
                        !isThai && pp.previousClose != null
                          ? toBaht(pp.previousClose, currencyRate)
                          : undefined
                      }
                    />
                  </>
                )}
              </>
            )}

            {activeTab === "analysis" && (
              <>
                {!levels ? (
                  <div
                    style={{
                      padding: "40px 0",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.2)",
                      fontSize: 13,
                      fontFamily: "monospace",
                    }}
                  >
                    กำลังโหลด...
                  </div>
                ) : (
                  <>
                    <SectionLabel>วิเคราะห์เทคนิค</SectionLabel>
                    <StatRow
                      label="จุดซื้อ 1"
                      animatedValue={levels.entry1}
                      active={
                        (displayPrice ?? 0) <= levels.entry1 &&
                        (displayPrice ?? 0) > levels.entry2
                      }
                      activeColor="emerald"
                    />
                    <StatRow
                      label="จุดซื้อ 2"
                      animatedValue={levels.entry2}
                      active={(displayPrice ?? 0) <= levels.entry2}
                      activeColor="emerald"
                    />
                    <StatRow
                      label="จุดตัดขาดทุน"
                      animatedValue={levels.stopLoss}
                      active={(displayPrice ?? 0) <= levels.stopLoss}
                      activeColor="red"
                    />
                    <StatRow
                      label="แนวต้าน"
                      animatedValue={levels.resistance}
                      active={
                        (displayPrice ?? 0) >= levels.resistance * 0.98 &&
                        (displayPrice ?? 0) <= levels.resistance * 1.02
                      }
                      activeColor="orange"
                    />
                    <StatRow label="เทรนด์" value={levels.trend} />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
