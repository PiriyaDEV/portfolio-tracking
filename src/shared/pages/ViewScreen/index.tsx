// ViewScreen/index.tsx
"use client";

import { AdvancedLevels } from "@/app/api/stock/support.function";
import StockCard from "../AnalystScreen/components/StockCard";
import StockSearchSelect from "./components/StockSearchSelect";

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
    <div className="w-full px-4 mt-4 space-y-4 pb-[120px]">
      {/* Search */}
      <StockSearchSelect
        onSelect={handleSearch}
        clearAfterSelect
      />

      {loading && <div className="text-gray-400">กำลังโหลด...</div>}

      {/* Search Result */}
      <div className="text-sm font-semibold text-gray-300 mt-2">ผลการค้นหา</div>

      {!searchedSymbol && (
        <div className="text-sm text-gray-500 text-center">ยังไม่ได้ค้นหา</div>
      )}

      {searchedSymbol && !loading && !searchedItem && (
        <div className="text-sm text-gray-500 text-center">ไม่พบข้อมูล</div>
      )}

      {searchedItem && (
        <StockCard
          symbol={searchedItem.symbol}
          price={searchedItem.price}
          levels={searchedItem.levels}
          pinned={wishlist.includes(searchedItem.symbol)}
          onTogglePin={onTogglePin}
        />
      )}

      {/* Wishlist */}
      {wishlistItems.length > 0 && (
        <div className="text-sm font-semibold text-gray-300 mt-4">
          รายการโปรด ({wishlistItems.length} / 12)
        </div>
      )}

      {wishlistItems.map((item) => (
        <StockCard
          key={item.symbol}
          symbol={item.symbol}
          price={item.price}
          levels={item.levels}
          pinned
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
}