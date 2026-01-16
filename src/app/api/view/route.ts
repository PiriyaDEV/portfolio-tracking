import { NextRequest, NextResponse } from "next/server";
import { getAdvancedLevels } from "@/app/api/stock/support.function";

/**
 * POST /api/view
 * body: { symbol: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    const levels = await getAdvancedLevels(symbol.toUpperCase());

    // If Yahoo failed → currentPrice will be 0 from INITIAL_LEVELS
    if (!levels || levels.currentPrice <= 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลหุ้น" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        symbol: levels.symbol,
        price: levels.currentPrice,
        levels,
      },
    });
  } catch (error) {
    console.error("[VIEW_API_ERROR]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
