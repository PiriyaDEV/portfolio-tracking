import { NextRequest, NextResponse } from "next/server";

const FINNHUB_API_BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY || ""; // Move key to .env

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

export async function POST(req: NextRequest) {
  try {
    const { assets, isMock }: { assets: Asset[]; isMock?: boolean } =
      await req.json();

    const results: Record<string, number | null> = {};
    const validAssets: Asset[] = [];

    for (const asset of assets) {
      let res: any = {};

      if (isMock) {
        res = { c: 190.17, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 };
      } else {
        const url = new URL(`${FINNHUB_API_BASE_URL}/quote`);
        url.searchParams.append("symbol", asset.symbol);
        url.searchParams.append("token", API_KEY);

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Fetch error for ${asset.symbol}`);

        res = await response.json();
      }

      // Check if response is valid
      const isInvalid =
        res.c === 0 &&
        (res.d === null || res.dp === null) &&
        res.h === 0 &&
        res.l === 0 &&
        res.o === 0 &&
        res.pc === 0;

      if (!isInvalid) {
        results[asset.symbol] = res.c ?? null;
        validAssets.push(asset);
      }
    }

    return NextResponse.json({ prices: results, assets: validAssets });
  } catch (error: any) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
