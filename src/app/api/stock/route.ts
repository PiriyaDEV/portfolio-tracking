import { NextRequest, NextResponse } from "next/server";
import { AdvancedLevels, getAdvancedLevels } from "./support.function";

const FINNHUB = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY || "";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

const fetchJSON = async (url: string) => {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
};

export async function POST(req: NextRequest) {
  try {
    const { assets, isMock }: { assets: Asset[]; isMock?: boolean } =
      await req.json();

    const prices: Record<string, number | null> = {};
    const previousPrice: Record<string, number | null> = {};
    const advancedLevels: Record<string, AdvancedLevels | null> = {};
    const validAssets: Asset[] = [];

    for (const asset of assets) {
      const symbol = asset.symbol;

      if (isMock) {
        advancedLevels[symbol] = {
          symbol,
          currentPrice: 190.17,
          previousClose: 180,
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

        prices[symbol] = 190.17;
        previousPrice[symbol] = 185.5;
        validAssets.push(asset);
        continue;
      }

      const recData = await fetchJSON(
        `${FINNHUB}/stock/recommendation?symbol=${symbol}&token=${API_KEY}`
      );

      const latest = recData?.[0];
      const recommendation = latest && {
        strongBuy: latest.strongBuy,
        buy: latest.buy,
        hold: latest.hold,
        sell: latest.sell,
        strongSell: latest.strongSell,
      };

      const levels = await getAdvancedLevels(symbol);
      advancedLevels[symbol] = { ...levels, recommendation };

      if (levels.currentPrice || levels.previousClose) {
        prices[symbol] = levels.currentPrice ?? null;
        previousPrice[symbol] = levels.previousClose ?? null;
        validAssets.push(asset);
      }
    }

    return NextResponse.json({
      prices,
      previousPrice,
      assets: validAssets,
      advancedLevels,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
