import { NextRequest, NextResponse } from "next/server";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

// const BIG_SYMBOLS = [];

const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;

/* ======================
   HELPERS
====================== */
function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const format = (d: Date) => d.toISOString().slice(0, 10);

  return {
    from: format(monday),
    to: format(friday),
  };
}

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

  const SYMBOLS = Array.from(
    new Set([...assets.map((a) => normalize(a.symbol))]),
  );

  const { from, to } = getRange15Days();

  const result: any[] = [];

  for (const symbol of SYMBOLS) {
    const url =
      `https://finnhub.io/api/v1/calendar/earnings` +
      `?from=${from}&to=${to}&symbol=${symbol}&token=${FINNHUB_KEY}`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      const earnings = json.earningsCalendar ?? [];

      earnings.forEach((e: any) => {
        result.push({
          symbol: symbol,
          company: e.company ?? e.symbol,
          reportDate: e.date,
          announceTime:
            e.hour === "amc"
              ? "After Market Close"
              : e.hour === "bmo"
                ? "Before Market Open"
                : "Not Supplied",
          epsEstimate: e.epsEstimate,
        });
      });
    } catch (err) {
      console.error("❌ Finnhub error:", symbol, err);
    }
  }

  return NextResponse.json(result);
}
