import { create } from "zustand";
import { Asset } from "@/app/lib/interface";
import { AdvancedLevels } from "@/app/api/stock/support.function";
import {
  defaultMarketResponse,
  MarketResponse,
} from "@/shared/pages/AnalystScreen/components/GraphPrice";

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
  // Market data (shared across all pages)
  prices: Record<string, number | null>;
  previousPrice: Record<string, number | null>;
  graphs: Record<string, any>;
  advancedLevels: Record<string, AdvancedLevels>;
  dividend: any;
  currencyRate: number;
  market: MarketResponse;
  formattedDate: string;

  // Loading flags
  isLoading: boolean;
  isFirstBatchLoaded: boolean;
  isSilentRefreshing: boolean;

  // Actions
  loadData: (
    assets: Asset[],
    userId: string,
    userColId: string,
    saveSession: (uid: string, colId: string) => void,
  ) => Promise<void>;
  silentRefresh: (assets: Asset[]) => Promise<void>;
  resetMarket: () => void;
}

// ─── Guard: prevent overlapping silent refresh ────────────────────────────────
let _isSilentRefreshing = false;

// ─── Store ────────────────────────────────────────────────────────────────────
export const useMarketStore = create<MarketState>((set, get) => ({
  // Initial state
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

  // ── Reset (e.g. when user changes or assets change) ─────────────────────────
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

  // ── Full load (shows loading spinner) ───────────────────────────────────────
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
        fetchFinancialData(assets, set),
        fetchFxRate(set),
        fetchMarket(set),
      ]);
      set({ formattedDate: buildFormattedDate() });
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Silent refresh (no spinner — merges into existing state) ─────────────────
  silentRefresh: async (assets) => {
    if (_isSilentRefreshing) return;
    _isSilentRefreshing = true;
    set({ isSilentRefreshing: true });

    try {
      await Promise.all([
        fetchFinancialData(assets, set),
        fetchFxRate(set),
        fetchMarket(set),
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

// ─── Shared fetch helpers (outside store — no closure issues) ─────────────────

const BATCH_SIZE = 5;
const isMock = false;

async function fetchFinancialData(
  assets: Asset[],
  set: (partial: Partial<MarketState>) => void,
) {
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
      });
      if (!res.ok) throw new Error("Failed to fetch /api/stock");
      const data = await res.json();

      // Merge into existing state (works for both full load and silent refresh)
      useMarketStore.setState((prev) => ({
        prices: { ...prev.prices, ...(data.prices ?? {}) },
        previousPrice: { ...prev.previousPrice, ...(data.previousPrice ?? {}) },
        graphs: { ...prev.graphs, ...(data.graphs ?? {}) },
        advancedLevels: {
          ...prev.advancedLevels,
          ...(data.advancedLevels ?? {}),
        },
        dividend: {
          baseCurrency: data.dividendSummary?.baseCurrency,
          perAsset: {
            ...prev.dividend?.perAsset,
            ...(data.dividendSummary?.perAsset ?? {}),
          },
          totalAnnualDividend:
            (prev.dividend?.totalAnnualDividend ?? 0) +
            (data.dividendSummary?.totalAnnualDividend ?? 0),
        },
      }));

      // Show content after first batch
      if (index === 0) {
        useMarketStore.setState({ isFirstBatchLoaded: true, isLoading: false });
      }
    } catch (err) {
      console.error("fetchFinancialData batch error:", err);
    }
  }
}

async function fetchFxRate(set: (partial: Partial<MarketState>) => void) {
  if (isMock) {
    set({ currencyRate: 32.31 });
    return;
  }
  try {
    const res = await fetch("/api/rate", { method: "POST" });
    if (!res.ok) throw new Error(`BOT API Error: ${res.status}`);
    const data = await res.json();
    set({ currencyRate: Number(data.rate) ?? 0 });
  } catch (err) {
    console.error("fetchFxRate error:", err);
  }
}

async function fetchMarket(set: (partial: Partial<MarketState>) => void) {
  try {
    const res = await fetch("/api/market");
    const json = await res.json();
    set({ market: json.data });
  } catch (err) {
    console.error("fetchMarket error:", err);
  }
}
