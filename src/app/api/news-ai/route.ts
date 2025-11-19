import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export async function POST(req: NextRequest) {
  const { symbol } = await req.json();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    const yahooFinance = new YahooFinance();

    const results = await yahooFinance.search(symbol);
    return NextResponse.json({ results: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
