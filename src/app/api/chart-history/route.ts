import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type Range = "1h" | "1d" | "5d" | "1mo" | "6mo" | "1y";

const RANGE_CONFIG: Record<Range, { interval: string; range: string }> = {
  // ~30 แท่ง: ดึง 1 วัน แบ่งทีละ 15 นาที → ~26 แท่ง (ตลาดเปิด ~6.5h)
  "1h": { interval: "15m", range: "1d" },
  // ~22 แท่ง: ดึง 1 เดือน แบ่งทีละวัน
  "1d": { interval: "1d", range: "1mo" },
  // ~26 แท่ง: ดึง 6 เดือน แบ่งทีละสัปดาห์
  "5d": { interval: "1wk", range: "6mo" },
  // ~24 แท่ง: ดึง 2 ปี แบ่งทีละเดือน
  "1mo": { interval: "1mo", range: "2y" },
  // ~24 แท่ง: ดึง 6 ปี แบ่งทีละไตรมาส
  "6mo": { interval: "3mo", range: "6y" },
  // ~36 แท่ง: ดึง 3 ปี แบ่งทีละเดือน
  "1y": { interval: "1mo", range: "3y" },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const range = (searchParams.get("range") ?? "1d") as Range;

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG["1d"];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${config.interval}&range=${config.range}&includePrePost=true`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance error: ${res.status}` },
        { status: res.status },
      );
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }

    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const highs: number[] = result.indicators?.quote?.[0]?.high ?? [];
    const lows: number[] = result.indicators?.quote?.[0]?.low ?? [];
    const opens: number[] = result.indicators?.quote?.[0]?.open ?? [];
    const volumes: number[] = result.indicators?.quote?.[0]?.volume ?? [];

    const previousClose: number | null =
      result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null;

    const points = timestamps
      .map((ts, i) => ({
        time: ts * 1000,
        price: closes[i],
        high: highs[i],
        low: lows[i],
        open: opens[i],
        volume: volumes[i],
      }))
      .filter((p) => p.price != null && !isNaN(p.price));

    return NextResponse.json({
      symbol,
      range,
      previousClose,
      shortName: result.meta?.shortName ?? symbol,
      currency: result.meta?.currency ?? "USD",
      data: points,
    });
  } catch (err) {
    console.error("chart-history error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
