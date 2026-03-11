import { NextRequest, NextResponse } from "next/server";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const exchange = searchParams.get("exchange") ?? "US";

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ result: [] });
  }

  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&exchange=${exchange}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Finnhub request failed" },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Filter to Common Stock only and limit results
    const filtered = (data.result ?? [])
      .filter((item: { type: string }) => item.type === "Common Stock")
      .slice(0, 8);

    return NextResponse.json({ result: filtered });
  } catch (err) {
    console.error("[symbol-search] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
