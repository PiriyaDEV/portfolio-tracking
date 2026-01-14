import { NextRequest, NextResponse } from "next/server";
import { AdvancedLevels, getAdvancedLevels } from "./support.function";

const FINNHUB_API_BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY || "";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

export async function POST(req: NextRequest) {
  try {
    const { assets, isMock }: { assets: Asset[]; isMock?: boolean } =
      await req.json();

    const prices: Record<string, number | null> = {};
    const previousPrice: Record<string, number | null> = {};
    const logos: Record<string, string | null> = {};
    const advancedLevels: Record<string, AdvancedLevels | null> = {};

    const validAssets: Asset[] = [];

    for (const asset of assets) {
      let quote: any = {};
      let logo: string | null = null;

      if (isMock) {
        quote = {
          c: 190.17,
          pc: 185.5,
        };

        logo = "https://via.placeholder.com/30?text=Logo";

        advancedLevels[asset.symbol] = {
          symbol: asset.symbol,
          currentPrice: 190.17,
          ema20: 188,
          ema50: 182,
          entry1: 186,
          entry2: 183,
          stopLoss: 178,
          resistance: 195,
          trend: "UP",
        };
      } else {
        // ===== Fetch quote =====
        const quoteUrl = new URL(`${FINNHUB_API_BASE_URL}/quote`);
        quoteUrl.searchParams.append("symbol", asset.symbol);
        quoteUrl.searchParams.append("token", API_KEY);

        const quoteRes = await fetch(quoteUrl.toString());
        if (!quoteRes.ok)
          throw new Error(`Quote fetch failed: ${asset.symbol}`);
        quote = await quoteRes.json();

        // ===== Fetch company profile =====
        const profileUrl = new URL(`${FINNHUB_API_BASE_URL}/stock/profile2`);
        profileUrl.searchParams.append("symbol", asset.symbol);
        profileUrl.searchParams.append("token", API_KEY);

        const profileRes = await fetch(profileUrl.toString());
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          logo = profileData.logo || null;
        }

        // ===== Fetch advanced technical levels =====
        advancedLevels[asset.symbol] = await getAdvancedLevels(asset.symbol);
      }

      // ===== Validate quote =====
      const isInvalid = quote.c === 0 && quote.pc === 0;

      if (!isInvalid) {
        prices[asset.symbol] = quote.c ?? null;
        previousPrice[asset.symbol] = quote.pc ?? null;
        logos[asset.symbol] = logo;
        validAssets.push(asset);
      }
    }

    return NextResponse.json({
      prices,
      previousPrice,
      logos,
      assets: validAssets,
      advancedLevels, // 🔥 ส่ง AdvancedLevels กลับไปตรง ๆ
    });
  } catch (error: any) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
