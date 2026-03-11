"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SymbolSuggestion {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

type Exchange = "US" | "BK";

const EXCHANGES: { value: Exchange; label: string; flag: string }[] = [
  { value: "US", label: "US", flag: "🇺🇸" },
  { value: "BK", label: "TH", flag: "🇹🇭" },
];

interface StockSearchSelectProps {
  /** Called when user confirms a selection (Enter, button click, or dropdown pick) */
  onSelect: (symbol: string) => void;
  /** Controlled value — shows in the input when set externally */
  value?: string;
  placeholder?: string;
  /** Hide the exchange chips (default: false) */
  hideExchangeChips?: boolean;
  /** Default exchange (default: "US") */
  defaultExchange?: Exchange;
  /** Max height of the suggestions dropdown e.g. 200 or "40vh" (default: unconstrained) */
  maxDropdownHeight?: number | string;
}

export default function StockSearchSelect({
  onSelect,
  value,
  placeholder,
  hideExchangeChips = false,
  defaultExchange = "US",
  maxDropdownHeight = 150,
}: StockSearchSelectProps) {
  const [query, setQuery] = useState(value ?? "");
  const [exchange, setExchange] = useState<Exchange>(defaultExchange);
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Sync external value → input */
  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  /* -------------------- Fetch -------------------- */
  const fetchSuggestions = useCallback(async (q: string, ex: Exchange) => {
    if (q.trim().length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setSuggestionsLoading(true);
    try {
      const res = await fetch(
        `/api/stock/symbol-search?q=${encodeURIComponent(q)}&exchange=${ex}`,
      );
      const json = await res.json();
      setSuggestions(json.result ?? []);
      setShowDropdown(true);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchSuggestions(query, exchange),
      300,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, exchange, fetchSuggestions]);

  /* -------------------- Click outside -------------------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* -------------------- Handlers -------------------- */
  const handleSelect = (s: SymbolSuggestion) => {
    setQuery(s.displaySymbol);
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(s.symbol);
  };

  const handleConfirm = () => {
    if (!query.trim()) return;
    setShowDropdown(false);
    onSelect(query.trim().toUpperCase());
  };

  const handleExchangeChange = (ex: Exchange) => {
    setExchange(ex);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Enter") handleConfirm();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((p) => Math.max(p - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) handleSelect(suggestions[activeIndex]);
      else handleConfirm();
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const resolvedPlaceholder =
    placeholder ??
    (exchange === "US"
      ? "ค้นหาหุ้น เช่น AAPL หรือ Apple"
      : "ค้นหาหุ้นไทย เช่น PTT");

  /* -------------------- Render -------------------- */
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Exchange chips */}
      {!hideExchangeChips && (
        <div className="flex gap-2">
          {EXCHANGES.map((ex) => {
            const active = exchange === ex.value;
            return (
              <button
                key={ex.value}
                type="button"
                onClick={() => handleExchangeChange(ex.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: active ? "#1a2e1a" : "#141414",
                  border: `1px solid ${active ? "#4ade80" : "#2a2a2a"}`,
                  color: active ? "#4ade80" : "#555",
                  boxShadow: active ? "0 0 8px rgba(74,222,128,0.15)" : "none",
                }}
              >
                <span>{ex.flag}</span>
                <span>{ex.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input + dropdown */}
      <div ref={containerRef} className="relative w-full">
        <div
          className="flex items-center rounded-xl"
          style={{
            background: "#111111",
            border: "1px solid #2a2a2a",
            boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          <span className="pl-3 pr-1 text-gray-500 text-base select-none">
            🔍
          </span>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder={resolvedPlaceholder}
            autoComplete="off"
            className="flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder-gray-600 outline-none"
          />

          {suggestionsLoading && (
            <span
              className="text-gray-500 text-xs mr-2 animate-spin inline-block"
              style={{ animationDuration: "0.7s" }}
            >
              ◌
            </span>
          )}

          <div className="w-px h-6 bg-gray-700 mx-1" />

          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-3 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors shrink-0"
          >
            ค้นหา
          </button>
        </div>

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <ul
            className="absolute top-full left-0 right-0 mt-1 z-50 overflow-y-auto"
            style={{
              background: "#0d0d0d",
              border: "1px solid #2a2a2a",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              ...(maxDropdownHeight !== undefined && {
                maxHeight:
                  typeof maxDropdownHeight === "number"
                    ? `${maxDropdownHeight}px`
                    : maxDropdownHeight,
              }),
            }}
          >
            {suggestions
              .filter(
                (s, idx, arr) =>
                  arr.findIndex((x) => x.symbol === s.symbol) === idx,
              )
              .map((s, i) => (
                <li
                  key={`${s.symbol}-${i}`}
                  onMouseDown={() => handleSelect(s)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm transition-colors"
                  style={{
                    background: i === activeIndex ? "#1a1a1a" : "transparent",
                    borderBottom: "1px solid #1c1c1c",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: "#1e2e1e",
                        color: "#4ade80",
                        minWidth: "52px",
                        textAlign: "center",
                      }}
                    >
                      {s.displaySymbol}
                    </span>
                    <span className="text-gray-400 text-xs truncate max-w-[180px]">
                      {s.description}
                    </span>
                  </div>
                  {/* <span
                    className="text-xs ml-2 shrink-0"
                    style={{ color: "#555" }}
                  >
                    {s.type}
                  </span> */}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
