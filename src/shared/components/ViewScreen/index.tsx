"use client";

import { useState } from "react";
import { AdvancedLevels } from "@/app/api/stock/support.function";
import StockCard from "../StockCard";

export interface StockResult {
  symbol: string;
  price: number;
  levels: AdvancedLevels;
}

interface Props {
  data: StockResult[];
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
  const [query, setQuery] = useState("");

  /* -------------------- Derived -------------------- */

  const searchedItem = searchedSymbol
    ? data.find((d) => d.symbol === searchedSymbol)
    : null;

  const wishlistItems = data.filter(
    (d) => wishlist.includes(d.symbol) && d.symbol !== searchedSymbol
  );

  /* -------------------- Handlers -------------------- */

  const handleSearch = () => {
    if (!query) return;
    onSearch(query);
  };

  /* -------------------- Render -------------------- */

  return (
    <div className="w-full px-4 mt-4 space-y-4 pb-[70px]">
      {/* Search */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="ค้นหาหุ้น (เช่น AAPL)"
          className="flex-1 rounded-lg bg-black-lighter border border-gray-700 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-green-600 text-sm font-semibold"
        >
          ค้นหา
        </button>
      </div>

      {loading && <div className="text-gray-400">กำลังโหลด...</div>}

      {/* 🔍 Search Result */}
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

      {/* ⭐ Wishlist */}
      {wishlistItems.length > 0 && (
        <div className="text-sm font-semibold text-gray-300 mt-4">
          รายการโปรด ({wishlistItems.length} / 6)
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
