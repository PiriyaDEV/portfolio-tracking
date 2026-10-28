"use client";

import StockLogo from "@/shared/components/common/StockLogo";
import { useState, useEffect, useRef } from "react";

interface Option {
  value: string;
  label: string;
  displayLabel?: string;
}

interface StockSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function StockSelect({
  options,
  value,
  onChange,
  placeholder = "เลือกหุ้น",
}: StockSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  /* Click outside to close */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Scroll selected item into view when opening */
  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector("[data-active='true']");
      if (activeEl) {
        (activeEl as HTMLElement).scrollIntoView({ block: "nearest" });
      }
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger — same shape as StockSearchSelect input row */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center rounded-xl transition-colors"
        style={{
          background: "var(--surface)",
          border: `1px solid ${open ? "rgba(244,197,66,0.55)" : "var(--surface-border)"}`,
          boxShadow: "0 6px 18px rgba(0,0,0,0.24)",
        }}
      >
        {/* Icon slot — mirrors the 🔍 position */}

        {selected && (
          <StockLogo symbol={selected.value} className="ml-3 h-[25px] w-[25px]" />
        )}

        <span
          className="flex-1 px-2 py-3 text-sm text-left"
          style={{ color: selected ? "var(--foreground)" : "var(--text-muted)" }}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              {/* Ticker badge — identical to dropdown badge */}
              <span
                className="text-xs font-bold px-2 py-0.5 rounded bg-black-lighter"
                style={{
                  minWidth: "52px",
                  textAlign: "center",
                }}
              >
                {selected.value}
              </span>
              <span className="text-gray-400 text-xs truncate">
                {selected.displayLabel ?? selected.value}
              </span>
            </span>
          ) : (
            placeholder
          )}
        </span>

        {/* Divider + chevron — mirrors the divider + ค้นหา area */}
        <div className="w-px h-6 bg-gray-700 mx-1" />
        <span
          className="px-4 py-3 text-gray-500 text-xs transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown — identical styling to StockSearchSelect dropdown */}
      {open && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 overflow-y-auto"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--surface-border)",
            borderRadius: "12px",
            boxShadow: "0 12px 28px rgba(0,0,0,0.38)",
            maxHeight: "240px",
          }}
        >
          {options.map((opt, i) => {
            const isActive = opt.value === value;
            return (
              <li
                key={opt.value}
                data-active={isActive}
                onMouseDown={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm transition-colors"
                style={{
                  background: isActive ? "rgba(244,197,66,0.08)" : "transparent",
                  borderBottom:
                    i < options.length - 1 ? "1px solid var(--surface-border)" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <StockLogo symbol={opt.value} className="ml-3 h-[25px] w-[25px]" />

                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      background: isActive ? "rgba(244,197,66,0.12)" : "#181714",
                      color: isActive ? "#f4c542" : "#a19a8a",
                      minWidth: "52px",
                      textAlign: "center",
                    }}
                  >
                    {opt.value}
                  </span>
                  <span className="text-gray-400 text-xs truncate max-w-[200px]">
                    {opt.displayLabel ?? opt.label}
                  </span>
                </div>
                {isActive && (
                  <span className="text-accent-yellow text-xs ml-2 shrink-0">
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
