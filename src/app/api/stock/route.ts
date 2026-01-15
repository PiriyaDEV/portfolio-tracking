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
          recommendation: {
            strongBuy: 10,
            buy: 6,
            hold: 2,
            sell: 0,
            strongSell: 0,
            signal: "STRONG_BUY",
          },
        };

        quote = { c: 190.17, pc: 185.5 };
        logo = "https://via.placeholder.com/30?text=Logo";
      } else {
        // ===== Quote =====
        const quoteRes = await fetch(
          `${FINNHUB_API_BASE_URL}/quote?symbol=${asset.symbol}&token=${API_KEY}`
        );
        if (!quoteRes.ok) continue;
        quote = await quoteRes.json();

        // ===== Profile =====
        const profileRes = await fetch(
          `${FINNHUB_API_BASE_URL}/stock/profile2?symbol=${asset.symbol}&token=${API_KEY}`
        );
        if (profileRes.ok) {
          const p = await profileRes.json();
          logo = p.logo || null;
        }

        // ===== Recommendation =====
        const recRes = await fetch(
          `${FINNHUB_API_BASE_URL}/stock/recommendation?symbol=${asset.symbol}&token=${API_KEY}`
        );

        let recommendation;
        if (recRes.ok) {
          const recData = await recRes.json();
          const latest = recData?.[0];

          if (latest) {
            recommendation = {
              strongBuy: latest.strongBuy,
              buy: latest.buy,
              hold: latest.hold,
              sell: latest.sell,
              strongSell: latest.strongSell,
            };
          }
        }

        // ===== Advanced Levels =====
        const levels = await getAdvancedLevels(asset.symbol);
        advancedLevels[asset.symbol] = {
          ...levels,
          recommendation,
        };
      }

      // ===== Validate =====
      if (quote.c !== 0 || quote.pc !== 0) {
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
      advancedLevels,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
