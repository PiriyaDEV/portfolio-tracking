import { NextRequest, NextResponse } from "next/server";
import { getAdvancedLevels } from "@/app/api/stock/support.function";

/**
 * POST /api/view/bulk
 * body: { symbols: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "Symbols array is required" },
        { status: 400 }
      );
    }

    // Normalize + deduplicate
    const uniqueSymbols = Array.from(
      new Set(
        symbols
          .filter((s) => typeof s === "string")
          .map((s) => s.toUpperCase())
      )
    );

    const results = await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        try {
          const levels = await getAdvancedLevels(symbol);

          if (!levels || levels.currentPrice <= 0) {
            return null;
          }

          return {
            symbol: levels.symbol,
            price: levels.currentPrice,
            levels,
          };
        } catch {
          return null;
        }
      })
    );

    // Remove failed symbols
    const data = results.filter(Boolean);

    if (data.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลหุ้น" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[VIEW_BULK_API_ERROR]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
