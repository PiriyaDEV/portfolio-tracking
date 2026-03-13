/* =======================
   Sort Icon Helper
======================= */

import { SortOrder } from ".";

/* =======================
   Profit Badge Component
======================= */

export function ProfitBadge({ percentChange }: { percentChange: number }) {
  const isUp = percentChange > 0;
  const isDown = percentChange < 0;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.02em",
    padding: "5px 10px",
    borderRadius: "10px",
    fontVariantNumeric: "tabular-nums",
  };

  if (isUp) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "rgba(34,197,94,0.15)",
          border: "1px solid rgba(34,197,94,0.3)",
          color: "#4ade80",
        }}
      >
        <span style={{ fontSize: "9px" }}>▲</span>+{percentChange.toFixed(2)}%
      </div>
    );
  }

  if (isDown) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171",
        }}
      >
        <span style={{ fontSize: "9px" }}>▼</span>
        {percentChange.toFixed(2)}%
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        background: "rgba(156,163,175,0.15)",
        border: "1px solid rgba(156,163,175,0.2)",
        color: "#9ca3af",
      }}
    >
      <span style={{ fontSize: "9px" }}>—</span>
      {percentChange.toFixed(2)}%
    </div>
  );
}

/* =======================
   Pre/Post Session Badge
======================= */

export function SessionBadge({
  session,
  ppChange,
}: {
  session: "pre" | "post" | "closed";
  ppChange: number | null;
}) {
  const isUp = (ppChange ?? 0) > 0;
  const isDown = (ppChange ?? 0) < 0;

  const label =
    session === "pre" ? "ก่อน:" : session === "post" ? "หลัง:" : "ตลาดปิด";

  const color = isUp ? "#4ade80" : isDown ? "#f87171" : "#6b7280";

  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 600,
        color,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {session !== "closed" && ppChange != null && (
        <span className="ml-1">
          {isUp ? "+" : ""}
          {ppChange.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: SortOrder | null;
}) {
  if (!active) {
    return (
      <span
        style={{
          color: "rgba(255,255,255,0.2)",
          fontSize: "9px",
          lineHeight: 1,
        }}
      >
        ▲▼
      </span>
    );
  }
  return (
    <span style={{ color: "#a78bfa", fontSize: "10px", lineHeight: 1 }}>
      {order === "asc" ? "▲" : "▼"}
    </span>
  );
}

/* =======================
   Skeleton Components
======================= */

export function SkeletonPulse({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: "rgba(255,255,255,0.08)", ...style }}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 py-2">
      {/* LEFT skeleton */}
      <div className="flex items-center gap-2">
        <SkeletonPulse className="w-[30px] h-[30px] rounded-full" />
        <div className="flex flex-col gap-1.5">
          <SkeletonPulse className="h-[16px] w-[80px]" />
          <SkeletonPulse className="h-[12px] w-[60px]" />
        </div>
      </div>

      {/* GRAPH skeleton */}
      <SkeletonPulse className="w-full h-full min-h-[50px] rounded-md" />

      {/* PROFIT skeleton */}
      <div className="flex flex-col items-end gap-1.5">
        <SkeletonPulse className="h-[30px] w-[70px] rounded-lg" />
        <SkeletonPulse className="h-[10px] w-[50px]" />
        <SkeletonPulse className="h-[12px] w-[65px]" />
      </div>
    </div>
  );
}

export function SkeletonMarketBar() {
  return (
    <div className="flex items-center gap-2.5 min-w-max">
      {[...Array(5)].map((_, i) => (
        <SkeletonPulse
          key={i}
          className="h-[44px] rounded-[10px]"
          style={{ width: `${80 + i * 10}px` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}