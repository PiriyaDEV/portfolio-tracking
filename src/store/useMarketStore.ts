import { create } from "zustand";
import { Asset } from "@/app/lib/interface";
import { AdvancedLevels } from "@/app/api/stock/support.function";
import {
  defaultMarketResponse,
  MarketResponse,
} from "@/shared/pages/AnalystScreen/components/GraphPrice";
import { MARKET_KEY_TO_SYMBOL } from "@/app/config";

// ─── Thai month labels ────────────────────────────────────────────────────────
const thaiMonths = [
  "ม.ค",
  "ก.พ",
  "มี.ค",
  "เม.ย",
  "พ.ค",
  "มิ.ย",
  "ก.ค",
  "ส.ค",
  "ก.ย",
  "ต.ค",
  "พ.ย",
  "ธ.ค",
];

async function retry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 800,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;

    console.warn("Retrying API...", retries);

    await new Promise((r) => setTimeout(r, delay));
    return retry(fn, retries - 1, delay);
  }
}

function buildFormattedDate(): string {
  const now = new Date();
  const day = now.getDate();
  const month = thaiMonths[now.getMonth()];
  const year = (now.getFullYear() + 543) % 100;
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes} น.`;
}

// ─── State shape ──────────────────────────────────────────────────────────────
export interface MarketState {
  prices: Record<string, number | null>;
  previousPrice: Record<string, number | null>;
  graphs: Record<string, any>;
  advancedLevels: Record<string, AdvancedLevels>;
  dividend: any;
  currencyRate: number;
  market: MarketResponse;

  marketStatus: {
    isOpen: boolean;
    session: string | null;
    isPrePost: boolean;
  };

  formattedDate: string;

  isLoading: boolean;
  isFirstBatchLoaded: boolean;
  isSilentRefreshing: boolean;

  loadData: (
    assets: Asset[],
    userId: string,
    userColId: string,
    saveSession: (uid: string, colId: string) => void,
  ) => Promise<void>;
  silentRefresh: (assets: Asset[]) => Promise<void>;
  resetMarket: () => void;
  fetchMarketStatus: () => Promise<void>;
}

// ─── Guard: prevent overlapping silent refresh ────────────────────────────────
let _isSilentRefreshing = false;

// ─── Store ────────────────────────────────────────────────────────────────────
export const useMarketStore = create<MarketState>((set, get) => ({
  prices: {},
  previousPrice: {},
  graphs: {},
  advancedLevels: {},
  dividend: {},
  currencyRate: 0,
  market: defaultMarketResponse,
  formattedDate: "",

  isLoading: true,
  isFirstBatchLoaded: false,
  isSilentRefreshing: false,

  marketStatus: {
    isOpen: false,
    session: null,
    isPrePost: false,
  },

  fetchMarketStatus: async () => {
    try {
      const res = await fetch("/api/market-status");
      const json = await res.json();

      const session = json?.session ?? null;
      const isPrePost = session === "pre-market" || session === "post-market";
      const isOpen =
        session === "regular" ||
        session === "pre-market" ||
        session === "post-market";

      useMarketStore.setState({
        marketStatus: { session, isOpen, isPrePost },
      });
    } catch (err) {
      console.error("fetchMarketStatus error:", err);
    }
  },

  resetMarket: () =>
    set({
      prices: {},
      previousPrice: {},
      graphs: {},
      advancedLevels: {},
      dividend: {},
      currencyRate: 0,
      market: defaultMarketResponse,
      formattedDate: "",
      isLoading: true,
      isFirstBatchLoaded: false,
    }),

  loadData: async (assets, userId, userColId, saveSession) => {
    if (!assets || assets.length === 0) {
      set({ isLoading: false });
      return;
    }

    saveSession(userId, userColId);

    set({
      isLoading: true,
      isFirstBatchLoaded: false,
      prices: {},
      previousPrice: {},
      graphs: {},
      advancedLevels: {},
      dividend: {},
    });

    try {
      await Promise.all([
        retry(() => fetchFinancialData(assets)),
        retry(() => fetchFxRate()),
        retry(() => fetchMarket()),
        retry(() => get().fetchMarketStatus()),
      ]);
      set({ formattedDate: buildFormattedDate() });
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  // FIX: silentRefresh now uses retry consistently, matching loadData behaviour.
  silentRefresh: async (assets) => {
    if (_isSilentRefreshing) return;
    _isSilentRefreshing = true;
    set({ isSilentRefreshing: true });

    try {
      await Promise.all([
        retry(() => fetchFinancialData(assets)),
        retry(() => fetchFxRate()),
        retry(() => fetchMarket()),
        // get().fetchMarketStatus(),
      ]);
      set({ formattedDate: buildFormattedDate() });
    } catch (err) {
      console.error("silentRefresh error:", err);
    } finally {
      _isSilentRefreshing = false;
      set({ isSilentRefreshing: false });
    }
  },
}));

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const BATCH_SIZE = 5;
const isMock = false;

async function fetchFinancialData(assets: Asset[]) {
  const batches: Asset[][] = [];
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    batches.push(assets.slice(i, i + BATCH_SIZE));
  }

  for (const [index, batch] of batches.entries()) {
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: batch, isMock }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch /api/stock");
      const data = await res.json();

      useMarketStore.setState((prev) => {
        const mergedPerAsset = {
          ...prev.dividend?.perAsset,
          ...(data.dividendSummary?.perAsset ?? {}),
        };

        const total = Object.values(mergedPerAsset).reduce(
          (sum: number, d: any) => sum + (d?.annualDividendBase ?? 0),
          0,
        );

        return {
          prices: { ...prev.prices, ...(data.prices ?? {}) },
          previousPrice: {
            ...prev.previousPrice,
            ...(data.previousPrice ?? {}),
          },
          graphs: { ...prev.graphs, ...(data.graphs ?? {}) },
          advancedLevels: {
            ...prev.advancedLevels,
            ...(data.advancedLevels ?? {}),
          },
          dividend: {
            baseCurrency: data.dividendSummary?.baseCurrency,
            perAsset: mergedPerAsset,
            totalAnnualDividend: total,
          },
        };
      });

      if (index === 0) {
        useMarketStore.setState({ isFirstBatchLoaded: true, isLoading: false });
      }
    } catch (err) {
      console.error("fetchFinancialData batch error:", err);
    }
  }
}

async function fetchFxRate() {
  if (isMock) {
    useMarketStore.setState({ currencyRate: 32.31 });
    return;
  }
  try {
    const res = await fetch("/api/rate", { method: "GET" });
    if (!res.ok) throw new Error(`BOT API Error: ${res.status}`);
    const data = await res.json();
    useMarketStore.setState({ currencyRate: Number(data.rate) ?? 0 });
  } catch (err) {
    console.error("fetchFxRate error:", err);
  }
}

async function fetchMarket() {
  try {
    const res = await fetch("/api/market");
    const json = await res.json();
    const marketData: MarketResponse = json.data;

    // FIX: Compute price/previousPrice patches first, then merge everything
    // into a single setState call — was previously two separate calls which
    // triggered two Zustand re-renders on every refresh.
    const pricesPatch: Record<string, number | null> = {};
    const prevPatch: Record<string, number | null> = {};

    for (const [key, symbol] of Object.entries(MARKET_KEY_TO_SYMBOL)) {
      const item = (marketData as any)[key] as
        | { price: number | null; changePercent: number | null }
        | undefined;
      if (!item?.price) continue;

      const price = item.price;
      const pct = item.changePercent;

      pricesPatch[symbol] = price;

      if (pct != null) {
        // prev = price / (1 + pct/100)
        prevPatch[symbol] = price / (1 + pct / 100);
      }
    }

    // Single setState merges market data + injected prices in one render.
    useMarketStore.setState((prev) => ({
      market: marketData,
      prices: { ...prev.prices, ...pricesPatch },
      previousPrice: { ...prev.previousPrice, ...prevPatch },
    }));
  } catch (err) {
    console.error("fetchMarket error:", err);
  }
}
