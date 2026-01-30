import { NextRequest, NextResponse } from "next/server";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;

/* ======================
   HELPERS
====================== */

function getRange15Days() {
  const now = new Date();

  const from = new Date(now);
  from.setDate(now.getDate() - 15);

  const to = new Date(now);
  to.setDate(now.getDate() + 15);

  const format = (d: Date) => d.toISOString().slice(0, 10);

  return {
    from: format(from),
    to: format(to),
  };
}

const normalize = (s: string) => s.replace("-", ".").toUpperCase();

/* ======================
   API
====================== */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const assets: Asset[] = body.assets ?? [];

  const SYMBOLS = Array.from(new Set(assets.map((a) => normalize(a.symbol))));

  const { from, to } = getRange15Days();

  /** เก็บ event ที่ "วันแรกสุด" ต่อ symbol */
  const bySymbol: Record<string, any> = {};

  for (const symbol of SYMBOLS) {
    const url =
      `https://finnhub.io/api/v1/calendar/earnings` +
      `?from=${from}&to=${to}&symbol=${symbol}&token=${FINNHUB_KEY}`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      const earnings = json.earningsCalendar ?? [];

      earnings.forEach((e: any) => {
        const reportDate = e.date;
        if (!reportDate) return;

        const prev = bySymbol[symbol];

        // 👉 เลือกวันที่ "เร็วที่สุด" เท่านั้น
        if (
          !prev ||
          new Date(reportDate).getTime() < new Date(prev.reportDate).getTime()
        ) {
          bySymbol[symbol] = {
            symbol,
            company: e.company ?? symbol,
            reportDate,
            announceTime:
              e.hour === "amc"
                ? "After Market Close"
                : e.hour === "bmo"
                  ? "Before Market Open"
                  : "Not Supplied",
            epsEstimate: e.epsEstimate,
          };
        }
      });
    } catch (err) {
      console.error("❌ Finnhub error:", symbol, err);
    }
  }

  return NextResponse.json(Object.values(bySymbol));
}
