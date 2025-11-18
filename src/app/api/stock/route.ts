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
    const logos: Record<string, string | null> = {};
    const previousPrice: Record<string, number | null> = {};
    const validAssets: Asset[] = [];

    for (const asset of assets) {
      let res: any = {};
      let logo: string | null = null;

      if (isMock) {
        res = { c: 190.17, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 };
        logo = "https://via.placeholder.com/30?text=Logo"; // placeholder for mock
      } else {
        // Fetch quote
        const quoteUrl = new URL(`${FINNHUB_API_BASE_URL}/quote`);
        quoteUrl.searchParams.append("symbol", asset.symbol);
        quoteUrl.searchParams.append("token", API_KEY);

        const quoteRes = await fetch(quoteUrl.toString());
        if (!quoteRes.ok) throw new Error(`Fetch error for ${asset.symbol}`);
        res = await quoteRes.json();

        // Fetch company profile for logo
        const profileUrl = new URL(`${FINNHUB_API_BASE_URL}/stock/profile2`);
        profileUrl.searchParams.append("symbol", asset.symbol);
        profileUrl.searchParams.append("token", API_KEY);

        const profileRes = await fetch(profileUrl.toString());
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          logo = profileData.logo || null;
        }
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
        previousPrice[asset.symbol] = res.pc ?? null;
        validAssets.push(asset);
        logos[asset.symbol] = logo;
      }
    }

    return NextResponse.json({
      prices: results,
      assets: validAssets,
      logos,
      previousPrice,
    });
  } catch (error: any) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
