// app/api/earning-price/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Given a symbol + reportDate + announceTime,
 * returns the % price change on the "reaction day"
 *
 * Rules:
 *  - Before Market Open  → reaction day = reportDate itself
 *  - After Market Close  → reaction day = reportDate + 1 business day
 *  - Unknown             → reaction day = reportDate itself
 *
 * Also returns currentPrice for future earnings.
 */

function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function toYYYYMMDD(d: Date) {
  return d.toISOString().split("T")[0];
}

async function fetchOHLC(symbol: string, dateStr: string) {
  const target = new Date(dateStr);
  const from = new Date(target);
  from.setDate(target.getDate() - 5); // ขยาย window ให้จับวันก่อนหน้าได้
  const to = new Date(target);
  to.setDate(target.getDate() + 2);

  const period1 = Math.floor(from.getTime() / 1000);
  const period2 = Math.floor(to.getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&period1=${period1}&period2=${period2}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const json = await res.json();

  const result = json?.chart?.result?.[0];
  if (!result) return null;

  const timestamps: number[] = result.timestamp ?? [];
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
  const opens: number[] = result.indicators?.quote?.[0]?.open ?? [];

  const targetDay = new Date(
    new Date(dateStr).getFullYear(),
    new Date(dateStr).getMonth(),
    new Date(dateStr).getDate(),
  );

  // หา index ที่ตรงกับ reaction day
  let targetIdx = -1;
  let bestDiff = Infinity;

  timestamps.forEach((ts, i) => {
    const barDate = new Date(ts * 1000);
    const barDay = new Date(
      barDate.getFullYear(),
      barDate.getMonth(),
      barDate.getDate(),
    );
    const diff = Math.abs(barDay.getTime() - targetDay.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      targetIdx = i;
    }
  });

  if (targetIdx === -1) return null;

  const close = closes[targetIdx]; // ราคาปิด reaction day = "หลังประกาศ"
  const prevClose = targetIdx > 0 ? closes[targetIdx - 1] : null; // ปิดวันก่อน = "ก่อนประกาศ"

  if (!close) return null;

  // % เทียบ prevClose → close (ถ้ามี) หรือ open → close (fallback)
  const base = prevClose ?? opens[targetIdx];
  const pct = base ? ((close - base) / base) * 100 : null;

  return {
    pct: pct !== null ? +pct.toFixed(2) : undefined,
    close: +close.toFixed(2),
    prevClose: prevClose !== null ? +prevClose!.toFixed(2) : undefined,
  };
}

async function fetchCurrentPrice(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;
  const json = await res.json();

  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta) return null;

  const price = meta.regularMarketPrice ?? meta.previousClose;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose;

  if (!price || !prevClose) return null;

  const pct = ((price - prevClose) / prevClose) * 100;
  return { price: +price.toFixed(2), pct: +pct.toFixed(2) };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // body: Array<{ symbol, reportDate, announceTime }>
  const items: { symbol: string; reportDate: string; announceTime: string }[] =
    body.items ?? [];

  const results = await Promise.all(
    items.map(async (item) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reportDay = new Date(item.reportDate);
      reportDay.setHours(0, 0, 0, 0);

      const isFutureDate = reportDay > today;
      const isTodayDate = reportDay.getTime() === today.getTime();

      if (isFutureDate) {
        // Return current price + today's % change
        const data = await fetchCurrentPrice(item.symbol);
        return { symbol: item.symbol, type: "future", ...data };
      }

      // Past or today — determine reaction day
      let reactionDate: string;
      if (item.announceTime === "After Market Close") {
        const next = addBusinessDays(new Date(item.reportDate), 1);
        reactionDate = toYYYYMMDD(next);
      } else {
        reactionDate = item.reportDate;
      }

      const data = await fetchOHLC(item.symbol, reactionDate);
      return {
        symbol: item.symbol,
        type: isTodayDate ? "today" : "past",
        reactionDate,
        pct: data?.pct,
        close: data?.close,
        prevClose: data?.prevClose, // ← เพิ่มตรงนี้
      };
    }),
  );

  return NextResponse.json(results);
}
