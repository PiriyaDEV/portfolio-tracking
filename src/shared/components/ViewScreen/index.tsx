"use client";

import { useState } from "react";
import { AdvancedLevels } from "@/app/api/stock/support.function";
import StockCard from "../StockCard";

interface Props {
  logos: any;
}

export default function ViewScreen({ logos }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    symbol: string;
    price: number;
    levels: AdvancedLevels;
  } | null>(null);

  const handleSearch = async () => {
    if (!query) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: query.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setResult(json.data);
    } catch {
      setError("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 mt-4 space-y-4 pb-[70px]">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="ค้นหาหุ้น (เช่น AAPL)"
          className="flex-1 rounded-lg bg-black-lighter border border-gray-700 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-green-600 text-sm font-semibold"
        >
          Search
        </button>
      </div>

      {loading && <div className="text-gray-400">กำลังค้นหา...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {result && (
        <StockCard
          symbol={result.symbol}
          price={result.price}
          levels={result.levels}
          logos={logos}
        />
      )}
    </div>
  );
}
