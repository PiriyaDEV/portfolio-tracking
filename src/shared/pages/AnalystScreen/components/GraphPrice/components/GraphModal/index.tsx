"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
  Time,
} from "lightweight-charts";
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
  // { label: "5m", value: "5m" },
  // { label: "15m", value: "15m" },
  { label: "ชั่วโมง", value: "1h" },
  // { label: "4H", value: "4h" },
  { label: "วัน", value: "1d" },
  { label: "สัปดาห์", value: "1wk" },
  { label: "เดือน", value: "1mo" },
];

// Number of candles visible in the default right-anchored window.
// User can still scroll left to see all historical data.
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
   LWChart
======================= */

const CHART_HEIGHT = 266;

interface LWChartProps {
  rawData: ChartHistoryPoint[];
  prevPrice: number | null;
  range: TimeRange;
  isLoading: boolean;
  isUp: boolean;
}

function LWChart({ rawData, prevPrice, range, isLoading, isUp }: LWChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleRef = useRef<ISeriesApi<"Candlestick", any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volRef = useRef<ISeriesApi<"Histogram", any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevLineRef = useRef<any | null>(null);

  // ── Create chart once — use autoSize so lightweight-charts owns resizing ───
  useEffect(() => {
    if (!containerRef.current) return;

    let chart: IChartApi | null = null;

    chart = createChart(containerRef.current, {
      autoSize: true,
      height: CHART_HEIGHT,
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
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1a1a1a",
        },
        horzLine: {
          color: "rgba(255,255,255,0.2)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1a1a1a",
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.06, bottom: 0.24 },
        textColor: "rgba(255,255,255,0.3)",
      },
      timeScale: {
        borderVisible: false,
        timeVisible:
          range === "1m" ||
          range === "5m" ||
          range === "15m" ||
          range === "1h" ||
          range === "4h",
        secondsVisible: false,
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

    // Candlestick series (v5 API)
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#4ade80",
      downColor: "#f87171",
      borderUpColor: "#4ade80",
      borderDownColor: "#f87171",
      wickUpColor: "rgba(74,222,128,0.65)",
      wickDownColor: "rgba(248,113,113,0.65)",
    });

    // Volume histogram — separate scale, bottom 18%, clear gap from candles
    const vol = chart.addSeries(HistogramSeries, {
      color: "rgba(100,100,100,0.3)",
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false,
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync timeScale options when range changes ────────────────────────────
  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: {
        timeVisible:
          range === "1m" ||
          range === "5m" ||
          range === "15m" ||
          range === "1h" ||
          range === "4h",
      },
    });
  }, [range]);

  // ── Feed data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current || !volRef.current || !rawData.length) return;

    // Deduplicate by unix-second timestamp, sort ascending
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
      const t = Math.floor(d.time / 1000) as unknown as Time;
      const ts = t as unknown as number;

      candleMap.set(ts, {
        time: t,
        open: d.open ?? d.price,
        high: d.high ?? d.price,
        low: d.low ?? d.price,
        close: d.price,
      });

      const upBar = d.price >= (d.open ?? d.price);
      volMap.set(ts, {
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

    // Scroll so the last N candles are visible; user can pan left freely
    const visibleCount = VISIBLE_CANDLES[range];
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - visibleCount),
      to: candles.length - 1,
    });

    // Previous-close dashed price line — remove stale line before re-creating
    if (prevLineRef.current) {
      try {
        candleRef.current.removePriceLine(prevLineRef.current);
      } catch (_) {}
      prevLineRef.current = null;
    }
  }, [rawData, range, prevPrice]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          height: CHART_HEIGHT,
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
    );
  }

  if (!rawData.length) {
    return (
      <div
        style={{
          height: CHART_HEIGHT,
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

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: CHART_HEIGHT,
        overflow: "hidden",
        borderRadius: 8,
      }}
    />
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
  const [range, setRange] = useState<TimeRange>("1d");
  const [chartHistory, setChartHistory] = useState<ChartHistoryResponse | null>(
    null,
  );
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [displayedRange, setDisplayedRange] = useState<TimeRange>("1d");
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
  const chartData = (() => {
    if (displayedRange === "1m" && rawChartData.length > 0) {
      // route already returns only today's 1m bars — use them all
      return rawChartData;
    }
    return rawChartData;
  })();

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
                    height: CHART_HEIGHT,
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
