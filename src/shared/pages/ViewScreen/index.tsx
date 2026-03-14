// ViewScreen/index.tsx
"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import StockCard from "../AnalystScreen/components/StockCard";
import StockSearchSelect from "./components/StockSearchSelect";
import { useState } from "react";
import { GraphModal } from "../AnalystScreen/components/GraphPrice/components/GraphModal";
import { useMarketStore } from "@/store/useMarketStore";
import CommonLoading from "@/shared/components/common/CommonLoading";

export interface StockResult {
  symbol: string;
  price: number;
  levels: AdvancedLevels;
}

interface Props {
  data?: StockResult[];
  wishlist: string[];
  loading: boolean;
  searchedSymbol: string | null;
  onSearch: (symbol: string) => void;
  onTogglePin: (symbol: string) => void;
}

export default function ViewScreen({
  data,
  wishlist,
  loading,
  searchedSymbol,
  onSearch,
  onTogglePin,
}: Props) {
  const safeData: StockResult[] = Array.isArray(data) ? data : [];
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { currencyRate } = useMarketStore();

  const searchedItem = searchedSymbol
    ? safeData.find((d) => d.symbol === searchedSymbol)
    : null;

  const wishlistItems = safeData.filter(
    (d) => wishlist.includes(d.symbol) && d.symbol !== searchedSymbol,
  );

  const handleSearch = (symbol: string) => {
    onSearch(symbol);
  };

  return (
    <div className="w-full px-4 mt-4 space-y-3 pb-[120px]">
      {selectedSymbol && (
        <GraphModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          currencyRate={currencyRate}
        />
      )}

      {/* Search */}
      <StockSearchSelect onSelect={handleSearch} clearAfterSelect />

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center mt-[200px]">
          <CommonLoading isFullScreen={false} />
        </div>
      )}

      {/* Search Result Section */}
      {!loading && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold uppercase text-gray-500">
              ผลการค้นหา
            </span>
            <div className="flex-1 h-px bg-gray-700/60" />
          </div>

          {!searchedSymbol && (
            <div className="flex flex-col items-center py-6 gap-2 text-gray-600">
              <svg
                className="w-8 h-8 opacity-40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <span className="text-sm text-gray-500">ยังไม่ได้ค้นหา</span>
            </div>
          )}

          {searchedSymbol && !searchedItem && (
            <div className="flex flex-col items-center py-6 gap-2 text-gray-600">
              <svg
                className="w-8 h-8 opacity-40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>
              <span className="text-sm text-gray-500">ไม่พบข้อมูล</span>
            </div>
          )}

          {searchedItem && (
            <StockCard
              symbol={searchedItem.symbol}
              price={searchedItem.price}
              levels={searchedItem.levels}
              pinned={wishlist.includes(searchedItem.symbol)}
              onTogglePin={onTogglePin}
              onSelect={(sym) => setSelectedSymbol(sym)}
            />
          )}

          {/* Wishlist Section */}
          {wishlistItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  รายการโปรด
                </span>
                <span className="text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 leading-none">
                  {wishlistItems.length} / 12
                </span>
                <div className="flex-1 h-px bg-gray-700/60" />
              </div>

              {wishlistItems.map((item) => (
                <StockCard
                  key={item.symbol}
                  symbol={item.symbol}
                  price={item.price}
                  levels={item.levels}
                  onSelect={(sym) => setSelectedSymbol(sym)}
                  pinned
                  onTogglePin={onTogglePin}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
