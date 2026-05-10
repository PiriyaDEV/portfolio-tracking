"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  AreaSeries,
} from "lightweight-charts";

type ChartRow = {
  y: number;
  val: number;
};

type PredictChartProps = {
  rows: ChartRow[];
  years: number;
};

function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

export default function PredictChart({ rows, years }: PredictChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── destroy previous instance ──────────────────────────────────────────
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6b7280",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)", style: LineStyle.Solid },
        horzLines: { color: "rgba(255,255,255,0.04)", style: LineStyle.Solid },
      },
      crosshair: {
        vertLine: {
          color: "rgba(245,158,11,0.4)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#f59e0b",
        },
        horzLine: {
          color: "rgba(245,158,11,0.4)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#f59e0b",
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.05 },
        ticksVisible: true,
      },
      timeScale: {
        borderVisible: false,
        tickMarkFormatter: (time: number) => {
          // time here is our custom "year index" (0..N)
          if (time === 0) return "ปัจจุบัน";
          return `ปี ${time}`;
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // ── area series ────────────────────────────────────────────────────────
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#f59e0b",
      topColor: "rgba(245,158,11,0.25)",
      bottomColor: "rgba(245,158,11,0.01)",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: "#f59e0b",
      crosshairMarkerBackgroundColor: "#f59e0b",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => fmtShort(price),
        minMove: 1,
      },
    });

    // lightweight-charts requires ascending integer "time" values
    const data = rows.map((r) => ({
      time: r.y as unknown as string,
      value: r.val,
    }));
    areaSeries.setData(data as any);

    chart.timeScale().fitContent();

    // ── resize observer ────────────────────────────────────────────────────
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
        chart.timeScale().fitContent();
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [rows, years]);

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: 220 }} />
  );
}
