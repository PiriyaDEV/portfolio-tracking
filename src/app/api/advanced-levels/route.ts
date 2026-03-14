import { NextRequest, NextResponse } from "next/server";
import { getAdvancedLevels } from "../stock/support.function";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const levels = await getAdvancedLevels(symbol);
  return NextResponse.json(levels);
}