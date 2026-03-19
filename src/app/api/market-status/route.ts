import { NextResponse } from "next/server";

type MarketSession =
  | "overnight"
  | "pre-market"
  | "regular"
  | "post-market"
  | "closed";

type MarketStatus = {
  isOpen: boolean;
  isTradable: boolean; // 👈 แนะนำเพิ่ม (สำคัญ)
  session: MarketSession;
};

/**
 * Helper: check overnight (NY time)
 */
function isOvernightNY(): boolean {
  const ny = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    })
  );

  const minutes = ny.getHours() * 60 + ny.getMinutes();

  const overnightStart = 20 * 60; // 20:00
  const overnightEnd = 4 * 60; // 04:00

  return minutes >= overnightStart || minutes < overnightEnd;
}

/**
 * Yahoo-based market status (accurate: holiday, DST, early close)
 */
async function getYahooMarketStatus(): Promise<MarketStatus | null> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1m&range=1d",
      {
        next: { revalidate: 30 }, // ✅ ลดโหลด
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) return null;

    const now = Math.floor(Date.now() / 1000);

    const pre = meta.currentTradingPeriod?.pre;
    const regular = meta.currentTradingPeriod?.regular;
    const post = meta.currentTradingPeriod?.post;

    const inRange = (p?: { start: number; end: number }) =>
      p && now >= p.start && now < p.end;

    let session: MarketSession = "closed";

    if (inRange(pre)) session = "pre-market";
    else if (inRange(regular)) session = "regular";
    else if (inRange(post)) session = "post-market";
    else if (isOvernightNY()) session = "overnight";
    else session = "closed";

    return {
      session,
      // 👇 ตอบคำถามหลัก
      isOpen: session !== "closed", // ✅ รวม overnight
      isTradable:
        session === "regular" ||
        session === "pre-market" ||
        session === "post-market", // ❌ exclude overnight
    };
  } catch {
    return null;
  }
}

/**
 * Fallback: local time logic (no network)
 */
function getLocalMarketStatus(): MarketStatus {
  const ny = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    })
  );

  const day = ny.getDay();
  const minutes = ny.getHours() * 60 + ny.getMinutes();

  const overnightStart = 20 * 60;
  const overnightEnd = 4 * 60;

  const pre = 4 * 60;
  const regularStart = 9 * 60 + 30;
  const regularEnd = 16 * 60;
  const post = 20 * 60;

  let session: MarketSession = "closed";

  if (minutes >= overnightStart || minutes < overnightEnd) {
    session = "overnight";
  } else if (day !== 0 && day !== 6) {
    if (minutes >= pre && minutes < regularStart) {
      session = "pre-market";
    } else if (minutes >= regularStart && minutes < regularEnd) {
      session = "regular";
    } else if (minutes >= regularEnd && minutes < post) {
      session = "post-market";
    }
  }

  return {
    session,
    isOpen: session !== "closed",
    isTradable:
      session === "regular" ||
      session === "pre-market" ||
      session === "post-market",
  };
}

/**
 * GET /api/market-status
 */
export async function GET() {
  try {
    const yahoo = await getYahooMarketStatus();

    if (yahoo) {
      return NextResponse.json(yahoo);
    }

    const fallback = getLocalMarketStatus();
    return NextResponse.json(fallback);
  } catch (err) {
    console.error("market-status error:", err);

    return NextResponse.json({
      session: "closed",
      isOpen: false,
      isTradable: false,
    });
  }
}