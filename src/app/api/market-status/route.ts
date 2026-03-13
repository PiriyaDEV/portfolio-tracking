import { NextResponse } from "next/server";

export async function GET() {
  const forceOpen = false;

  if (forceOpen) {
    return NextResponse.json({
      isOpen: true,
      session: "force-open",
    });
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${process.env.FINNHUB_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 30 } });

    if (!res.ok) {
      return NextResponse.json({
        isOpen: false,
        session: "unknown",
      });
    }

    const data = await res.json();

    return NextResponse.json({
      isOpen: data?.isOpen === true,
      session: data?.session ?? "unknown",
    });
  } catch {
    return NextResponse.json({
      isOpen: false,
      session: "unknown",
    });
  }
}
