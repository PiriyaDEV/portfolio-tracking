import { NextRequest, NextResponse } from "next/server";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;

const ANNOUNCE_TIME: Record<string, string> = {
  amc: "After Market Close",
  bmo: "Before Market Open",
};

const normalize = (s: string) => s.replace("-", ".").toUpperCase();

function getDateRange(daysBefore: number, daysAfter: number) {
  const now = Date.now();
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return {
    from: fmt(now - daysBefore * 864e5),
    to: fmt(now + daysAfter * 864e5),
  };
}

async function fetchEarnings(symbol: string, from: string, to: string) {
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&symbol=${symbol}&token=${FINNHUB_KEY}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return (json.earningsCalendar ?? []) as any[];
  } catch (err) {
    console.error("Finnhub error:", symbol, err);
    return [];
  }
}

function pickEarliest(symbol: string, earnings: any[]) {
  let earliest: any = null;

  for (const e of earnings) {
    if (!e.date) continue;
    if (!earliest || new Date(e.date) < new Date(earliest.reportDate)) {
      earliest = {
        symbol,
        company: e.company ?? symbol,
        reportDate: e.date,
        announceTime: ANNOUNCE_TIME[e.hour] ?? "Not Supplied",
        epsEstimate: e.epsEstimate,
      };
    }
  }

  return earliest;
}

export async function POST(req: NextRequest) {
  const { assets = [] }: { assets: Asset[] } = await req.json();

  const symbols = [...new Set(assets.map((a) => normalize(a.symbol)))];
  const { from, to } = getDateRange(15, 15);

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const earnings = await fetchEarnings(symbol, from, to);
      return pickEarliest(symbol, earnings);
    }),
  );

  return NextResponse.json(results.filter(Boolean));
}
