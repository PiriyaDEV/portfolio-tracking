import { NextRequest, NextResponse } from "next/server";
import { TimeRange } from "@/app/api/chart-history/route";
import { AdvancedLevels } from "@/app/api/stock/support.function";

/* ─────────────────────────────────────────────
   Types (mirrored from each sub-route)
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

type ChartHistoryData = {
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

export type GraphDetailResponse = {
  symbol: string;
  range: TimeRange;
  prepost: PrePostData | null;
  levels: AdvancedLevels | null;
  chart: ChartHistoryData | null;
  errors: {
    prepost?: string;
    levels?: string;
    chart?: string;
  };
};

/* ─────────────────────────────────────────────
   Helper — safe fetch → json or null
───────────────────────────────────────────── */

async function safeJson<T>(
  url: string,
  tag: string,
): Promise<{ data: T | null; error?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    return { data: (await res.json()) as T };
  } catch (e) {
    return { data: null, error: `${tag}: ${String(e)}` };
  }
}

/* ─────────────────────────────────────────────
   GET /api/graph-detail?symbol=AAPL&range=1d
───────────────────────────────────────────── */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol");
  const range = (searchParams.get("range") ?? "1d") as TimeRange;

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const base = req.nextUrl.origin;
  const enc = encodeURIComponent(symbol);

  const [prepostResult, levelsResult, chartResult] = await Promise.all([
    safeJson<PrePostData>(`${base}/api/prepost?symbol=${enc}`, "prepost"),
    safeJson<AdvancedLevels>(
      `${base}/api/advanced-levels?symbol=${enc}`,
      "advanced-levels",
    ),
    safeJson<ChartHistoryData>(
      `${base}/api/chart-history?symbol=${enc}&range=${range}`,
      "chart-history",
    ),
  ]);

  const errors: GraphDetailResponse["errors"] = {};
  if (prepostResult.error) errors.prepost = prepostResult.error;
  if (levelsResult.error) errors.levels = levelsResult.error;
  if (chartResult.error) errors.chart = chartResult.error;

  const body: GraphDetailResponse = {
    symbol,
    range,
    prepost: prepostResult.data,
    levels: levelsResult.data,
    chart: chartResult.data,
    errors,
  };

  return NextResponse.json(body);
}
