import { NextRequest, NextResponse } from "next/server";
import { getAdvancedLevels } from "@/app/api/stock/support.function";
import { getRecommendation } from "../stock/recommendation.function";

const BAD_REQUEST = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 });

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? "";

/**
 * POST /api/view/bulk
 * body: { symbols: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return BAD_REQUEST("Symbols array is required");
    }

    const uniqueSymbols = [
      ...new Set(
        symbols
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.toUpperCase()),
      ),
    ];

    if (uniqueSymbols.length === 0) {
      return BAD_REQUEST("No valid symbols provided");
    }

    const results = await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        try {
          // Fetch levels and recommendation concurrently per symbol
          const [levels, recommendation] = await Promise.all([
            getAdvancedLevels(symbol),
            getRecommendation(symbol, FINNHUB_API_KEY),
          ]);

          if (!levels?.currentPrice || levels.currentPrice <= 0) return null;

          return {
            symbol: levels.symbol,
            price: levels.currentPrice,
            levels: { ...levels, recommendation },
          };
        } catch {
          return null;
        }
      }),
    );

    const data = results.filter(Boolean);

    if (data.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลหุ้น" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[VIEW_BULK_API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
