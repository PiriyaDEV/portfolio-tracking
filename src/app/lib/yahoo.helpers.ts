/**
 * yahoo.helpers.ts
 * Shared utilities for Yahoo Finance API calls.
 * Used by: route.ts (portfolio) and compare/route.ts
 */

/* =======================
   Symbol Normalization
======================= */

const SYMBOL_MAP: Record<string, string> = {
  "GOLD-USD": "GC=F",
  "TISCO-PVD": "THB=X",
  "BTC-USD": "BTC-USD",
};

export function normalizeYahooSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  return SYMBOL_MAP[s] ?? s;
}

/* =======================
   Core Chart Fetcher
======================= */

export type ChartPoint = { time: number; close: number | null };

export type YahooChartResult = {
  meta: any;
  data: ChartPoint[];
  highs: number[];
  lows: number[];
};

export async function fetchYahooChart(
  rawSymbol: string,
  range: string,
  interval: string,
): Promise<YahooChartResult> {
  const symbol = normalizeYahooSymbol(rawSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo fetch failed: ${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] | undefined = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];
  const closes: (number | null)[] | undefined = quote?.close;

  if (!timestamps || !closes) throw new Error(`Invalid Yahoo data: ${symbol}`);

  const data: ChartPoint[] = timestamps.map((t, i) => ({
    time: t,
    close: closes[i],
  }));

  const highs: number[] = (quote?.high ?? []).filter((v: number) => v != null);
  const lows: number[] = (quote?.low ?? []).filter((v: number) => v != null);

  return { meta: result?.meta, data, highs, lows };
}

/* =======================
   FX Rate
======================= */

export async function fetchUSDTHBRate(): Promise<number> {
  const { data } = await fetchYahooChart("USDTHB=X", "2d", "1d");
  const latest = [...data].reverse().find((p) => p.close != null);
  if (!latest?.close) throw new Error("No FX rate found");
  return latest.close;
}

/* =======================
   Previous Close
======================= */

export async function fetchPreviousClose(symbol: string): Promise<number> {
  const { data } = await fetchYahooChart(symbol, "5d", "1d");
  const closes = data.filter((p) => p.close != null);

  const last = closes.at(-1)?.close;
  const prev = closes.at(-2)?.close;
  const isIncomplete = last != null && prev != null && last === prev;

  return (
    (isIncomplete ? closes.at(-3) : closes.at(-2))?.close ?? closes[0].close!
  );
}

/* =======================
   NYSE / US Trading Hours
======================= */

export function isNYSEDaylightSaving(): boolean {
  const now = new Date();
  const year = now.getUTCFullYear();

  const march = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(
    Date.UTC(year, 2, 1 + ((14 - march.getUTCDay()) % 7)),
  );

  const nov = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(Date.UTC(year, 10, 1 + ((7 - nov.getUTCDay()) % 7)));

  return now >= dstStart && now < dstEnd;
}

export function isInUSTradingHoursTH(timestampSec: number): boolean {
  const date = new Date(timestampSec * 1000);
  const openUTCHour = isNYSEDaylightSaving() ? 13 : 14;
  const openUTCMinutes = openUTCHour * 60 + 30;
  const closeUTCMinutes = openUTCMinutes + 6 * 60 + 30;
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return utcMinutes >= openUTCMinutes && utcMinutes <= closeUTCMinutes;
}
