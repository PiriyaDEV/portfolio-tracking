import { NextRequest, NextResponse } from "next/server";
import { getAdvancedLevels } from "@/app/api/stock/support.function";

const BAD_REQUEST = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 });

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

    // Normalize + deduplicate in one pass
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
      uniqueSymbols.map((symbol) =>
        getAdvancedLevels(symbol)
          .then((levels) =>
            levels?.currentPrice > 0
              ? { symbol: levels.symbol, price: levels.currentPrice, levels }
              : null,
          )
          .catch(() => null),
      ),
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
