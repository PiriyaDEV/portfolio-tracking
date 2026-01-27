import { NextRequest, NextResponse } from "next/server";
import { AdvancedLevels, getAdvancedLevels } from "./support.function";

const FINNHUB = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY || "";

/* =======================
   Types
======================= */

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type DividendAssetResult = {
  originalCurrency: "THB" | "USD";
  dividendPerShare: number | null; // ต่อ 1 หุ้น / ปี
  annualDividend: number | null; // ตาม currency เดิม
  annualDividendBase: number | null; // แปลงเป็น baseCurrency
  dividendYieldPercent: number | null; // 🔥 Dividend Yield %
};

/* =======================
   Utils
======================= */

const fetchJSON = async (url: string) => {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return res.ok ? res.json() : null;
};

const isThaiStock = (symbol: string) => symbol.toUpperCase().endsWith(".BK");

/* =======================
   Yahoo FX
======================= */

/**
 * USDTHB=X = THB per 1 USD
 */
async function fetchUSDTHBRate(): Promise<number> {
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/USDTHB=X?range=5d&interval=1d",
    { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" },
  );

  if (!res.ok) throw new Error("FX fetch failed");

  const json = await res.json();
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;

  const latest = [...closes].reverse().find((c: number) => c != null);
  if (!latest) throw new Error("No FX rate found");

  return latest;
}

/* =======================
   Yahoo Dividend
======================= */

/**
 * Return TTM dividend per share
 */
async function fetchTTMDividend(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?range=1y&interval=1mo&events=div`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();
    const dividends = json?.chart?.result?.[0]?.events?.dividends;

    if (!dividends) return null;

    return Object.values(dividends).reduce(
      (sum: number, d: any) => sum + (d.amount || 0),
      0,
    );
  } catch {
    return null;
  }
}

/* =======================
   API
======================= */

export async function POST(req: NextRequest) {
  try {
    const {
      assets,
      isMock,
      baseCurrency = "THB",
    }: {
      assets: Asset[];
      isMock?: boolean;
      baseCurrency?: "THB" | "USD";
    } = await req.json();

    const prices: Record<string, number | null> = {};
    const previousPrice: Record<string, number | null> = {};
    const advancedLevels: Record<string, AdvancedLevels | null> = {};

    const dividendSummary: {
      baseCurrency: "THB" | "USD";
      perAsset: Record<string, DividendAssetResult>;
      totalAnnualDividend: number;
    } = {
      baseCurrency,
      perAsset: {},
      totalAnnualDividend: 0,
    };

    const validAssets: Asset[] = [];

    // FX (เรียกครั้งเดียว)
    const usdThbRate = await fetchUSDTHBRate();

    for (const asset of assets) {
      const symbol = asset.symbol;

      /* ---------- MOCK ---------- */
      if (isMock) {
        const originalCurrency = isThaiStock(symbol) ? "THB" : "USD";

        const dividendPerShare = originalCurrency === "THB" ? 0.9 : 0.96;

        const annualDividend = dividendPerShare * asset.quantity;

        const annualDividendBase =
          baseCurrency === originalCurrency
            ? annualDividend
            : baseCurrency === "THB"
              ? annualDividend * usdThbRate
              : annualDividend / usdThbRate;

        const mockPrice = 100;

        const dividendYieldPercent =
          mockPrice > 0 ? (dividendPerShare / mockPrice) * 100 : null;

        dividendSummary.perAsset[symbol] = {
          originalCurrency,
          dividendPerShare,
          annualDividend,
          annualDividendBase,
          dividendYieldPercent,
        };

        dividendSummary.totalAnnualDividend += annualDividendBase;

        prices[symbol] = mockPrice;
        previousPrice[symbol] = 98;
        validAssets.push(asset);
        continue;
      }

      /* ---------- FINNHUB ---------- */
      const recData = await fetchJSON(
        `${FINNHUB}/stock/recommendation?symbol=${symbol}&token=${API_KEY}`,
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
        const currentPrice = levels.currentPrice ?? null;

        prices[symbol] = currentPrice;
        previousPrice[symbol] = levels.previousClose ?? null;

        /* ---------- DIVIDEND ---------- */
        const dividendPerShare = await fetchTTMDividend(symbol);
        const originalCurrency = isThaiStock(symbol) ? "THB" : "USD";

        const annualDividend =
          dividendPerShare != null ? dividendPerShare * asset.quantity : null;

        let annualDividendBase: number | null = null;

        if (annualDividend != null) {
          if (baseCurrency === originalCurrency) {
            annualDividendBase = annualDividend;
          } else if (baseCurrency === "THB") {
            annualDividendBase = annualDividend * usdThbRate;
          } else {
            annualDividendBase = annualDividend / usdThbRate;
          }

          dividendSummary.totalAnnualDividend += annualDividendBase;
        }

        const dividendYieldPercent =
          dividendPerShare != null && currentPrice != null && currentPrice > 0
            ? (dividendPerShare / currentPrice) * 100
            : null;

        dividendSummary.perAsset[symbol] = {
          originalCurrency,
          dividendPerShare,
          annualDividend,
          annualDividendBase,
          dividendYieldPercent,
        };

        validAssets.push(asset);
      }
    }

    return NextResponse.json({
      prices,
      previousPrice,
      dividendSummary,
      assets: validAssets,
      advancedLevels,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
