import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";

// ─── Config ───────────────────────────────────────────────────────────────────

const LIMIT_PER_DAY = 1;
const COL_RECOMMEND = "F";
const COL_LAST_USED = "G";

export const STOCK_CATEGORIES = [
  { id: "tech", label: "หุ้นเทคโนโลยี" },
  { id: "pharma", label: "หุ้นยา / สุขภาพ" },
  { id: "defense", label: "หุ้นกลาโหม" },
  { id: "banking", label: "หุ้นการเงิน / ธนาคาร" },
  { id: "large_cap", label: "หุ้นใหญ่" },
  { id: "small_cap", label: "หุ้นเล็ก" },
  { id: "dividend", label: "หุ้นปันผล" },
  { id: "growth", label: "หุ้นเติบโต" },
  { id: "value", label: "หุ้น Value" },
];

export const RISK_LEVELS = [
  { id: "low", label: "ต่ำ" },
  { id: "medium", label: "กลาง" },
  { id: "high", label: "สูง" },
];

export const MARKETS = [
  { id: "th", label: "ไทย" },
  { id: "us", label: "US" },
  { id: "both", label: "ทั้งคู่" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type StockRecommendation = {
  ticker: string;
  name: string;
  allocateBaht: number;
  allocatePercent: number;
  currentPrice: number;
  currency: "THB" | "USD";
  return1M: number;
  upside: number;
  reason: string;
  market: "TH" | "US";
};

export type RecommendResponse = {
  recommendations: StockRecommendation[];
  summary: string;
  generatedAt: string;
  cached?: boolean;
  lastUsed?: string | null;
  nextAvailableAt?: string | null;
  canResearch: boolean;
};

// ─── Google Sheets ────────────────────────────────────────────────────────────

async function getGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function getUserSheetData(userId: string): Promise<{
  rowNumber: number;
  cachedData: RecommendResponse | null;
  lastUsed: Date | null;
} | null> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const sheets = await getGoogleSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:G",
  });

  const rows = res.data.values ?? [];
  const dataRows = rows.slice(1);

  const userRowIndex = dataRows.findIndex(
    (row) => row[0] && row[0].toString() === userId.toString(),
  );
  if (userRowIndex === -1) return null;

  const row = dataRows[userRowIndex];
  const rowNumber = userRowIndex + 2;

  let cachedData: RecommendResponse | null = null;
  try {
    if (row[5]) cachedData = JSON.parse(row[5]);
  } catch {
    cachedData = null;
  }

  const lastUsed = row[6] ? new Date(row[6]) : null;
  return { rowNumber, cachedData, lastUsed };
}

async function saveRecommendToSheet(
  rowNumber: number,
  data: RecommendResponse,
) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const sheets = await getGoogleSheets();

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `Sheet1!${COL_RECOMMEND}${rowNumber}`,
          values: [[JSON.stringify(data)]],
        },
        {
          range: `Sheet1!${COL_LAST_USED}${rowNumber}`,
          values: [[new Date().toISOString()]],
        },
      ],
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWithinOneDay(lastUsed: Date): boolean {
  return Date.now() - lastUsed.getTime() < 24 * 60 * 60 * 1000 * LIMIT_PER_DAY;
}

function calcNextAvailable(lastUsed: Date): string {
  return new Date(
    lastUsed.getTime() + 24 * 60 * 60 * 1000 * LIMIT_PER_DAY,
  ).toISOString();
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  const status = Number(e.status ?? e.statusCode ?? e.httpStatus ?? 0);
  if (status === 429 || status === 403) return true;
  const code = String(e.code ?? "").toLowerCase();
  if (code.includes("resource_exhausted") || code.includes("rate_limit"))
    return true;
  const msg = String(e.message ?? "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("limit exceeded") ||
    msg.includes("too many requests") ||
    msg.includes("429")
  );
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

/**
 * Fetch currentPrice and return1M for a single ticker from Yahoo Finance.
 * Returns null values if the request fails so the caller can fall back gracefully.
 */
async function fetchYahooPriceData(
  ticker: string,
): Promise<{ currentPrice: number | null; return1M: number | null }> {
  try {
    // "1mo" range with "1d" interval gives us ~22 daily closes
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker,
    )}?range=1mo&interval=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`Yahoo Finance ${ticker}: HTTP ${res.status}`);
      return { currentPrice: null, return1M: null };
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return { currentPrice: null, return1M: null };

    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((c) => c != null && !isNaN(c));

    if (validCloses.length === 0) return { currentPrice: null, return1M: null };

    const currentPrice = validCloses[validCloses.length - 1];
    const firstPrice = validCloses[0];

    const return1M =
      firstPrice > 0
        ? Math.round(((currentPrice - firstPrice) / firstPrice) * 1000) / 10 // one decimal
        : null;

    return { currentPrice: Math.round(currentPrice * 100) / 100, return1M };
  } catch (err) {
    console.warn(`Yahoo Finance fetch failed for ${ticker}:`, err);
    return { currentPrice: null, return1M: null };
  }
}

/**
 * Enrich all recommendations with live price data from Yahoo Finance.
 * Fetches all tickers in parallel; falls back to Gemini values on failure.
 */
async function enrichWithYahooPrices<
  T extends { ticker: string; currentPrice: number; return1M: number },
>(items: T[]): Promise<T[]> {
  const priceResults = await Promise.all(
    items.map((item) => fetchYahooPriceData(item.ticker)),
  );

  return items.map((item, i) => {
    const { currentPrice, return1M } = priceResults[i];
    return {
      ...item,
      currentPrice: currentPrice ?? item.currentPrice, // fall back to Gemini value
      return1M: return1M ?? item.return1M,
    };
  });
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(payload: {
  investmentAmount: number;
  categories: string[];
  riskLevel: string;
  market: string;
}): string {
  const marketLabel =
    payload.market === "th"
      ? "Thailand SET (Thai stocks only, tickers end with .BK)"
      : payload.market === "us"
        ? "US stocks only (NYSE/NASDAQ)"
        : "Mix of Thailand SET (.BK) and US stocks";

  return `You are an expert financial advisor. Recommend 3-5 stocks based on the investor profile below.

Investor Profile:
- Investment amount: ${payload.investmentAmount.toLocaleString()} THB
- Categories of interest: ${payload.categories.join(", ")}
- Risk tolerance: ${payload.riskLevel} (low = stable/blue-chip, medium = balanced, high = volatile/growth)
- Market preference: ${marketLabel}

Category guidance:
- tech → NVDA, MSFT, GOOGL, AAPL, META, AMZN (US) or DELTA.BK (TH)
- pharma → LLY, ABBV, JNJ, PFE (US)
- defense → LMT, RTX, NOC, GD (US)
- banking → JPM, BAC, GS (US) or KBANK.BK, BBL.BK, SCB.BK (TH)
- gold → GLD, IAU, SGOL (US) or GOLD.BK (TH)
- large_cap → AAPL, MSFT, GOOGL (US) or AOT.BK, CPALL.BK, PTT.BK (TH)
- small_cap → high-growth US mid-small caps or Thai small caps
- dividend → ABBV, T, VZ (US) or ADVANC.BK, PTT.BK, INTUCH.BK (TH)
- growth → NVDA, TSLA, META, AMD (US)
- value → BRK-B, GOOGL (US) or PTT.BK, KBANK.BK (TH)

For risk=low: avoid TSLA, prefer dividend/large-cap stocks
For risk=high: include TSLA, NVDA, or volatile small caps

Respond ONLY with a valid JSON array. No markdown, no explanation, no extra text.

Each item must have exactly these fields:
{
  "ticker": "string (e.g. NVDA or AOT.BK)",
  "name": "string (full company name)",
  "currency": "USD" or "THB",
  "upside": number (projected upside % for next 3 months, e.g. 12.0),
  "reason": "string (2-3 sentence Thai explanation why this stock is recommended)",
  "market": "US" or "TH"
}

Note: Do NOT include currentPrice or return1M — those will be fetched from live data.

Example output:
[
  {
    "ticker": "NVDA",
    "name": "NVIDIA Corporation",
    "currency": "USD",
    "upside": 12.5,
    "reason": "ผู้นำตลาด AI chip มีดีมานด์สูงจาก Data Center และ Blackwell GPU รุ่นใหม่กำลังส่งมอบ",
    "market": "US"
  }
]`;
}

// ─── GET — load saved recommendation + lastUsed ───────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (
      !process.env.GOOGLE_SHEET_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      return NextResponse.json(
        { error: "Google Sheets env missing" },
        { status: 500 },
      );
    }

    const userData = await getUserSheetData(userId);
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { cachedData, lastUsed } = userData;
    const canResearch = !lastUsed || !isWithinOneDay(lastUsed);

    if (!cachedData) {
      return NextResponse.json({
        recommendations: null,
        lastUsed: lastUsed?.toISOString() ?? null,
        nextAvailableAt: lastUsed ? calcNextAvailable(lastUsed) : null,
        canResearch,
      });
    }

    return NextResponse.json({
      ...cachedData,
      cached: true,
      lastUsed: lastUsed?.toISOString() ?? null,
      nextAvailableAt: lastUsed ? calcNextAvailable(lastUsed) : null,
      canResearch,
    });
  } catch (err) {
    console.error("GET recommend error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST — call Gemini → enrich with Yahoo Finance → save ───────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, investmentAmount, categories, riskLevel, market } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }
    if (!investmentAmount || !categories?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (
      !process.env.GOOGLE_SHEET_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      return NextResponse.json(
        { error: "Google Sheets env missing" },
        { status: 500 },
      );
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not set" },
        { status: 500 },
      );
    }

    const userData = await getUserSheetData(userId);
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { rowNumber, cachedData, lastUsed } = userData;

    // ── Block if still within rate limit window ───────────────────────────────
    if (lastUsed && isWithinOneDay(lastUsed)) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: `คุณได้ใช้งานครบ ${LIMIT_PER_DAY} ครั้ง/วันแล้ว`,
          lastUsed: lastUsed.toISOString(),
          nextAvailableAt: calcNextAvailable(lastUsed),
          canResearch: false,
          ...(cachedData ?? {}),
        },
        { status: 429 },
      );
    }

    // ── Call Gemini (no currentPrice / return1M requested) ────────────────────
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let rawText: string;
    try {
      const result = await model.generateContent(
        buildPrompt({ investmentAmount, categories, riskLevel, market }),
      );
      rawText = result.response.text().trim();
    } catch (geminiErr: unknown) {
      console.error("Gemini API error:", geminiErr);
      if (isQuotaError(geminiErr)) {
        return NextResponse.json(
          {
            error: "QUOTA_EXCEEDED",
            message:
              "Gemini API quota หมดแล้ว กรุณาลองใหม่ในภายหลัง หรือติดต่อผู้ดูแลระบบ",
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error: "AI_ERROR",
          message: "ไม่สามารถเชื่อมต่อ Gemini AI ได้ กรุณาลองใหม่",
        },
        { status: 502 },
      );
    }

    // ── Parse Gemini response ─────────────────────────────────────────────────
    type GeminiItem = Omit<
      StockRecommendation,
      "allocateBaht" | "allocatePercent" | "currentPrice" | "return1M"
    >;

    let rawItems: GeminiItem[];
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      rawItems = JSON.parse(cleaned);
      if (!Array.isArray(rawItems) || rawItems.length === 0)
        throw new Error("empty");
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return NextResponse.json(
        {
          error: "AI_ERROR",
          message: "AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง กรุณาลองใหม่",
        },
        { status: 500 },
      );
    }

    // ── Fetch live prices from Yahoo Finance (parallel) ───────────────────────
    const itemsWithPlaceholders = rawItems.map((item) => ({
      ...item,
      currentPrice: 0, // placeholder — will be overwritten
      return1M: 0, // placeholder — will be overwritten
    }));

    const enrichedItems = await enrichWithYahooPrices(itemsWithPlaceholders);

    // ── Build final recommendations ───────────────────────────────────────────
    const count = enrichedItems.length;
    const perStock = investmentAmount / count;

    const recommendations: StockRecommendation[] = enrichedItems.map(
      (item) => ({
        ticker: item.ticker,
        name: item.name,
        currentPrice: item.currentPrice,
        currency: item.currency,
        return1M: item.return1M,
        upside: item.upside,
        reason: item.reason,
        market: item.market,
        allocateBaht: Math.round(perStock),
        allocatePercent: Math.round((100 / count) * 10) / 10,
      }),
    );

    const now = new Date();

    const mappedCategories = categories
      .map((id: any) => {
        const found = STOCK_CATEGORIES.find((c) => c.id === id);
        return found ? found.label : id;
      })
      .join(", ");

    const mappedRisk =
      RISK_LEVELS.find((r) => r.id === riskLevel)?.label || riskLevel;

    const mappedMarket = MARKETS.find((m) => m.id === market)?.label || market;

    const response: RecommendResponse = {
      recommendations,
      summary: `AI แนะนำ ${count} หุ้น จากงบ ${investmentAmount.toLocaleString()} บาท 
(หมวด: ${mappedCategories}) 
(ความเสี่ยง: ${mappedRisk}) 
(ตลาด: ${mappedMarket})`,
      generatedAt: now.toISOString(),
      canResearch: false,
    };

    await saveRecommendToSheet(rowNumber, response);

    return NextResponse.json({
      ...response,
      cached: false,
      lastUsed: now.toISOString(),
      nextAvailableAt: calcNextAvailable(now),
      canResearch: false,
    });
  } catch (err) {
    console.error("Recommend API unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
